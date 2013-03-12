define(["dojo/_base/declare",
  "ppwcode/contracts/_Mixin",
  "./UrlBuilder", "./_Cache", "./PersistentObject", "./IdNotFoundException",
  "ppwcode/collections/ArraySet", "./PersistentObjectStore", "dojo/store/Observable",
  "dojo/Deferred", "dojo/request", "dojo/_base/lang", "ppwcode/oddsAndEnds/typeOf"],
  function(declare,
           _ContractMixin,
           UrlBuilder, _Cache, PersistentObject, IdNotFoundException,
           Set, PersistentObjectStore, Observable,
           Deferred, request, lang, typeOf) {

    function isIdNotFoundException(/*String*/ exc) {
      return exc && exc.isInstanceOf && exc.isInstanceOf(IdNotFoundException);
    }

//    function isSemanticException(/*String*/ error) {
//      return exc && exc.isInstanceOf && exc.isInstanceOf(SemanticException);
//    }

    function reportError(err) {
      console.error("ERROR (CrudDao):", err);
//      console.trace();
    }

    var CrudDao = declare([_ContractMixin], {
      // summary:
      //
      //   In the absence of some form of weak reference in JavaScript (promised for ECMAScript 6 / Harmony,
      //   see <http://wiki.ecmascript.org/doku.php?id=harmony:harmony>), we use reference tracking to be
      //   able to release instances from the cache.

      _c_invar: [
        function() {return this._c_prop("urlBuilder");},
        function() {return this.urlBuilder ? this.urlBuilder.isInstanceOf && this.urlBuilder.isInstanceOf(UrlBuilder) : true;}
      ],

      // urlBuilder: UrlBuilder
      urlBuilder: null,
      reviveInto: null,

      // _cache: Object
      //   Hash that stores all tracked objects and stores, using a cacheKey
      //   Contains an entry for each retrieved object, that is not yet released.
      // tags:
      //   private
      _cache: null,

      constructor: function() {
        this._cache = new _Cache();
      },

      _handleException: function(exc) {
        // MUDO triage and log as error, warn or trace; return triaged
//        console.warn(exc);
        reportError(exc);
        return exc;
      },

      _refresh: function(/*StoreOfStateful*/ result, /*String*/ url, /*Object?*/ query) {
        // summary:
        //   Get all the objects with `url` and the optional `query` from the remote server,
        //   and update `result` to reflect the returned collection when an answer arrives.
        //   This returns a Promise, that resolves to result.
        //   *The resulting objects are not tracked* // MUDO is dit wel goed?
        // result: StoreOfStateful
        //   Mandatory. When the promise is resolved, it will contain exactly the objects that were returned.
        // url: String
        //   Mandatory.
        // query: Object?
        //   Optional. The semantics of these parameters are left to the server.
        // description:
        //   The objects might be in result or the cache beforehand. Those objects are reloaded,
        //   and might send changed events.
        //
        //   The remote retrieve might fail, with an error, which is returned by the errback
        //   of the returned Promise. In that case, `result` is left unchanged.
        //
        //   A search for a specific `serverType` without a `query` should return all
        //   objects of that type.
        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return result && result.isInstanceOf;});
// Cannot really formulate what we want, because of stupid Observable Store wrapper
//        this._c_pre(function() {return result && result.isInstanceOf && result.isInstanceOf(StoreOfStateful);});
        this._c_pre(function() {return typeOf(url) === "string";});
        this._c_pre(function() {return !query || typeOf(query) === "object";});

        console.log("GET URL is: " + url);
        console.log("query: " + query);
        var self = this;
        var deferred = new Deferred();
        var loadPromise = request(
          url,
          {
            method:"GET",
            handleAs:"json",
            query:query,
            headers:{"Accept":"application/json"}
          }
        );
        loadPromise.then(
          function (data) {
            if (typeOf(data) !== "array") {
              throw new Error("expected array from remote call");
            }
            console.info("Retrieved successfully from server: " + data.length + " items");
            var revivePromise = self.reviveInto(null, data, null, self._cache);
            revivePromise.then(
              function (revived) {
                if (typeOf(data) !== "array") {
                  throw new Error("expected array from remote call");
                }
                result.loadAll(revived);
                deferred.resolve(result);
              },
              function (exc) {
                deferred.reject(self._handleException(exc));
              }
            );
          },
          function (exc) {
            deferred.reject(self._handleException(exc));
          }
        );
        return deferred.promise;
      },

      _poAction: function(/*String*/ method, /*PersistentObject*/ po, /*Any?*/ referer) {
        // summary:
        //   Ask the server to create, update, or delete po, track po on success,
        //   with referer, if provided.
        //   Returns a Promise.
        // method: String
        //   POST for create, PUT for update, DELETE for remove
        // description:
        //   The caller has a reference to po already. It is this object that will be reloaded
        //   with the result from the remote call, and thus "magically" have its properties changed,
        //   including the persistenceId on create.
        //   Since po is Stateful, listeners will be notified of this change.
        //   This means po can already be used.
        //
        //   The promise returns po after reload.
        //
        //   If anything fails during the request or revival of the response,
        //   the errback of the Promise is called with the exception. This can be a SemanticException.
        //   All other kinds of exceptions or value are to be considered errors.
        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return method === "POST" || method === "PUT" || method === "DELETE";});
        this._c_pre(function() {return po;});
        this._c_pre(function() {return po.isInstanceOf && po.isInstanceOf(PersistentObject);});

        console.log("Requested " + method + " of: " + po);
        var url = this.urlBuilder.get(method)(po.get("persistenceType"), po.get("persistenceId"));
        console.log(method + " URL is: " + url);
        var self = this;
        var deferred = new Deferred();
        var loadPromise = request(
          url,
          {
            method: method,
            handleAs: "json",
            data: JSON.stringify(po),
            headers: {"Accept" : "application/json"}
          }
        );
        loadPromise.then(
          function(data) {
            console.info("Create succes in server: " + data);
            var revivePromise = self.reviveInto(po, data, referer, self._cache);
            /*
             For create, tracking will only be added at the end, because we need a persistenceId for that.
             That is not a problem, since nobody should have a reference yet, except referer ...
             unless somebody does a very fast intermediate retrieve (which would be bad code, since
             that retrieve needs to have the persistenceId, which we don't even know yet).
             So with this caveat, there will only be 1 version of this new object in our RAM.

             For delete, the po will have persistenceId == null afterwards. It can no longer be cached,
             and is removed, as payload and referer.

             MUDO: the same happens when we get an IdNotFoundException in the other methods
             */
            revivePromise.then(
              function(revived) {
                if (po && revived !== po) {
                  throw new Error("revive promise should have provided po");
                }
                deferred.resolve(revived);
              },
              function(exc) {
                deferred.reject(self._handleException(exc));
              }
            );
          },
          function(exc) {
            deferred.reject(self._handleException(exc)); // communication error or IdNotFoundException of related objects
          }
        );
        return deferred.promise;
      },

      isOperational: function() {
        return this.urlBuilder && this.reviveInto;
      },

      track: function(/*PersistentObject*/ po, /*Any*/ referrer) {
        // summary:
        //   After this call, po will be in the cache, and be tracked by referrer.
        // description:
        //   If it was not in the cache yet, it is added, and referrer is added as referrer.
        //   If it was already in the cache, referrer is added as referrer.
        //   Since the referrers of a cache are a Set, there will be no duplicate entries.
        this._c_pre(function() {return po && po.isInstanceOf && po.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return referrer;});

        this._cache.trackPo(po, referrer); // TODO or store? not needed?
      },

      stopTracking: function(/*PersistentObject*/ po, /*Any*/ referer) {
        // summary:
        //   We note that referer no longer uses po.
        // description:
        //   If referer was the last referer of po, po is removed from the cache.
        //   If po is removed from the cache, it is also removed as a referer
        //   of all other entries (potentially resulting in removal from the cache
        //   of that entry, recursively).
        this._c_pre(function() {return po && po.isInstanceOf && po.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return referer;});

        this._cache.stopTracking(po, referer);
      },

      retrieve: function(/*String*/ serverType, /*Number*/ persistenceId, /*Any*/ referer) {
        // summary:
        //   Get the object of type `serverType` with `persistenceId` from the remote server.
        //   This returns a Promise.
        // description:
        //   In an earlier version, we returned an empty object immediately, created
        //   from a provided constructor. However, it is very well possible to ask for an
        //   instance of an Interface or other superclass, and thus get a result of more
        //   specific dynamic type. We don't know in advance what type the result will be,
        //   so we have to wait to create the object, based on type information payload
        //   to support polymorphism.
        //
        //   The resulting object is finally in the cache, and will be tracked by referer.
        //   PersistentObjects and StoreOfStatefuls the main object refers to,
        //   will be cached with the objects that hold them as referer.
        //
        //   The object might be in the cache beforehand. If it is, the returned Promise
        //   resolves immediately (we want to avoid users to need to use `when`).
        //   In any case, we still ask the data for the object from the server, asynchronously.
        //   On successful return of the retrieval call, the object is reloaded with the new data.
        //   It will send events (if reload is implemented correctly).
        //
        //   In other words, the resulting promise resolves as soon as we have an object
        //   for you, but it might be reloaded soon afterwards, and change.
        //
        //   The remote retrieve might fail, with an error, or an `IdNotFoundException`.
        //   If the object was not in the cache, the `Promise` error function is called
        //   with an error or the `IdNotFoundException`.
        //   If the object was in the cache, and we receive an `IdNotFoundException`, it means
        //   the object was deleted from the server persistent storage since the last time we got
        //   an update. We set the persistenceId to null, and remove it from the cache as
        //   a tracked value and a referrer. Users should watch changes in persistenceId
        //   to react accordingly. This can happen at any time, BTW.
        //   If the object was in the cache, and we get a communication error, we only
        //   log it as a warning. The problem might be transient.
        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return typeOf(serverType) === "string";});
        this._c_pre(function() {return typeOf(persistenceId) === "number";});
        this._c_pre(function() {return typeOf(referer) === "object";});

        console.log("Requested GET of: '" + serverType + "' with id '" + persistenceId + "'");
        var url = this.urlBuilder.retrieve(serverType, persistenceId);
        console.log("GET URL is: " + url);
        var self = this;
        var deferred = new Deferred();
        var loadPromise = request(
          url,
          {
            method: "GET",
            handleAs: "json",
            headers: {"Accept" : "application/json"},
            preventCache: true
          }
        );
        loadPromise.then(
          function(data) {
            console.info("Retrieved successfully from server: " + data);
            var revivePromise = self.reviveInto(null, data, referer, self._cache);
            revivePromise.then(
              function(revived) {
                deferred.resolve(revived);
              },
              function(exc) {
                deferred.reject(self._handleException(exc));
              }
            );
          },
          function(exc) {
            deferred.reject(self._handleException(exc)); // communication error or IdNotFoundException of related objects
          }
        );
        return deferred.promise;
      },

      create: function(/*PersistentObject*/ po, /*Any*/ referer) {
        // summary:
        //   Ask the server to create po, track po on success, with referer as the first referer.
        //   Returns a Promise.
        // description:
        //   po must have po.get("persistenceId") === null on call.
        //   The caller has a reference to po already. It is this object that will be reloaded
        //   with the result from the remote call, and thus "magically" have its properties changed,
        //   including the persistenceId.
        //   Since po is Stateful, listeners will be notified of this change.
        //   This means po can already be used.
        //
        //   The promise returns po after reload.
        //
        //   If anything fails during the request or revival of the response,
        //   the errback of the Promise is called with the exception. This can be a SemanticException.
        //   All other kinds of exceptions or value are to be considered errors.
        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return po;});
        this._c_pre(function() {return po.isInstanceOf && po.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return po.get("persistenceId") === null;});
        this._c_pre(function() {return referer;});

        return this._poAction("POST", po, referer);
      },

      update: function(/*PersistentObject*/ po) {
        // summary:
        //   Ask the server to update po.
        //   Returns a Promise.
        // description:
        //   po must have po.get("persistenceId") !== null on call.
        //   The caller has a reference to po already. It is this object that will be reloaded
        //   with the result from the remote call, and thus "magically" have its properties changed,
        //   including the persistenceId.
        //   Since po is Stateful, listeners will be notified of this change.
        //   This means po can already be used.
        //
        //   The promise returns po after reload.
        //
        //   If anything fails during the request or revival of the response,
        //   the errback of the Promise is called with the exception. This can be a SemanticException.
        //   All other kinds of exceptions or value are to be considered errors.
        var thisObject = this;
        this._c_pre(function() {return thisObject.isOperational();});
        this._c_pre(function() {return po;});
        this._c_pre(function() {return po.isInstanceOf && po.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return po.get("persistenceId") !== null;});

        return this._poAction("PUT", po);
      },

      remove: function(/*PersistentObject*/ po) {
        // summary:
        //   Ask the server to delete po.
        //   Returns a Promise.
        //   This call removes p from the cache, and removes p as referer to other objects from the cache.
        //   Upon completion, po.get("persistenceId") === null
        // description:
        //   po must have po.get("persistenceId") !== null on call.
        //   The caller has a reference to po already. It is this object that will be reloaded
        //   with the result from the remote call, and thus "magically" have its properties changed,
        //   including the persistenceId.
        //   Since po is Stateful, listeners will be notified of this change.
        //   This means po can already be used.
        //
        //   The promise returns po after reload.
        //
        //   If anything fails during the request or revival of the response,
        //   the errback of the Promise is called with the exception. This can be a SemanticException.
        //   All other kinds of exceptions or value are to be considered errors.
        var thisObject = this;
        this._c_pre(function() {return thisObject.isOperational();});
        this._c_pre(function() {return po;});
        this._c_pre(function() {return po.isInstanceOf && po.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return po.get("persistenceId") !== null;});

        return this._poAction("DELETE", po);
      },

      retrieveToMany: function(/*PersistentObject*/ po, /*String*/ serverPropertyName) {
        // summary:
        //   Load the objects of a to-many relationship from the remote server.
        //   These are the many objects of po[serverPropertyName].
        //   This returns a StoreOfStafeful, containing PersistentObjects.
        //   The resulting objects are tracked, with the store as referer. The store itself is also tracked,
        //   with po a referer.
        // po: PersistentObject
        //   po should be in the cache beforehand
        // serverPropertyName: String
        //   The name of the to-many property in server lingo.
        // description:
        //   If we find a StoreOfStateful in our cache for po[serverPropertyName], it will be returned, without
        //   change.
        //   If we don't find a StoreOfStateful in our cache, we create one, and start tracking it, and then
        //   return it to the caller, empty.
        //   Asynchronously, we get up-to-date content from the server, and will
        //   update the content of the store when the server returns a response.
        //   The store will send events (if reload is implemented correctly).
        //
        //   In other words, the  method returns a StoreOfStateful immediately, but it might be
        //   reloaded soon afterwards, and change.
        //
        //   The remote retrieve might fail, with an error, or an `IdNotFoundException`, or a
        //   `SecurityException`.
        //   TODO find a way to signal this as a state of the StoreOfStateful
        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return po && po.isInstanceOf && po.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return typeOf(serverPropertyName) === "string";});

        console.log("Requested GET of to many: '" + po + "[" + serverPropertyName+ "]'");
        var url = this.urlBuilder.toMany(po.get("persistenceType"), po.get("persistenceId"), serverPropertyName);
        // MUDO store from cache
        var store = Observable(new PersistentObjectStore());
        return this._refresh(store, url, null); // IDEA: we can even add a query here
      },

      searchInto: function(/*StoreOfStateful*/ result, /*String?*/ serverType, /*Object?*/ query) {
        // summary:
        //   Get all the objects of type `serverType` given the query from the remote server,
        //   and update `result` to reflect the returned collection when an answer arrives.
        //   This returns a Promise, that resolves to result.
        //   *The resulting objects are not tracked*
        // result: StoreOfStateful
        //   Mandatory. When the promise is resolved, it will contain exactly the objects that were returned.
        // serverType: String?
        //   Optional.
        // query: Object?
        //   Optional. The semantics of these parameters are left to the server.
        // description:
        //   The objects might be in result or the cache beforehand. Those objects are reloaded,
        //   and might send changed events.
        //
        //   The remote retrieve might fail, with an error, which is returned by the errback
        //   of the returned Promise. In that case, `result` is left unchanged.
        //
        //   A search for a specific `serverType` without a `query` should return all
        //   objects of that type.
        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return result && result.isInstanceOf;});
// Cannot really formulate what we want, because of stupid Observable Store wrapper
//        this._c_pre(function() {return result && result.isInstanceOf && result.isInstanceOf(StoreOfStateful);});
        this._c_pre(function() {return !serverType || typeOf(serverType) === "string";});
        this._c_pre(function() {return !query || typeOf(query) === "object";});

        console.log("Requested GET of matching instances: '" + serverType +"' matching '" + query + "'");
        var url = this.urlBuilder.search(serverType, query);
        return this._refresh(result, url, query);
      }

    });

    return CrudDao; // return Function
  }
);
