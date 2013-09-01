/*
 Copyright 2013 - $Date $ by PeopleWare n.v.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

define(["dojo/_base/declare",
        "ppwcode.contracts/_Mixin",
        "./UrlBuilder", "./_Cache", "./PersistentObject", "./IdNotFoundException",
        "dojo/Deferred", "dojo/request", "dojo/_base/lang", "ppwcode.oddsAndEnds/js", "dojo/has", "ppwcode.oddsAndEnds/log/logger!", "module"],
  function(declare,
           _ContractMixin,
           UrlBuilder, _Cache, PersistentObject, IdNotFoundException,
           Deferred, request, lang, js, has, logger, module) {

    function isIdNotFoundException(/*String*/ exc) {
      return exc && exc.isInstanceOf && exc.isInstanceOf(IdNotFoundException);
    }

//    function isSemanticException(/*String*/ error) {
//      return exc && exc.isInstanceOf && exc.isInstanceOf(SemanticException);
//    }

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

      // timeout: Number
      //   The default timeout in ms
      timeout: 10000, // needed for older hardware
      // IDEA detect we are on older hardware, and set it to 10 then; e.g., count to 1 000 000, and depending on the speed ...

      // urlBuilder: UrlBuilder
      urlBuilder: null,

      // revive: Function
      //   Object x Object x CrudDao -> Object|Promise of Object
      //   Function that returns the Promise of a revived object graph, based on an
      //   object tree (intended to be parsed JSON) of which the objects are to be reloaded
      //   in PersistentObjects, new or found in the cache of CrudDao. Objects are added to the cache
      //   of the given CrudDao with the second argument as referer on the first level, and the
      //   resulting PersistentObjects as referer for PersistentObject further down in the tree.
      //   As this might require module loading, the result might be a Promise.
      revive: null,

      // _cache: _Cache
      //   Hash that stores all tracked objects and stores, using a cacheKey
      //   Contains an entry for each retrieved object, that is not yet released.
      // tags:
      //   private
      _cache: null,

      // reporting: Boolean
      //   We report the state of the cache each _cacheReportingPeriod.
      //   -1 means no reporting (default); 0 means report on every access, > 0 means report each ... ms
      //   Use setCacheReportingPeriod to change, to trigger the intervals.
      _cacheReportingPeriod: -1,
      _cacheReportingTimer: null,

      setCacheReportingPeriod: function(value) {
        if (this._cacheReportingTimer) {
          clearTimeout(this._cacheReportingTimer);
        }
        this._cacheReportingPeriod = (js.typeOf(value) === "number") ? value : (value ? 0 : -1);
        if (value > 0) {
          this._cacheReportingTimer = setTimeout(lang.hitch(this._cache, this._cache.report), value);
        }
      },

      _optionalCacheReporting: function() {
        if (this._cacheReportingPeriod === 0) {
          console.info(this._cache.report());
        }
      },

      constructor: function() {
        this._cache = new _Cache();
        this.setCacheReportingPeriod(has(module.id + "-cacheReporting"));
        this._retrievePromiseCache = {};
      },

      _handleException: function(exc) {
        // MUDO triage and log as error, warn or trace; return triaged
//        console.warn(exc);
        logger.error(exc);
        return exc;
      },

      _refresh: function(/*PersistentObjectStore|Observable(PersistentObjectStore)*/ result,
                         /*String*/ url,
                         /*Object?*/ query,
                         /*Object?*/ referer) {
        // summary:
        //   Get all the objects with `url` and the optional `query` from the remote server,
        //   and update `result` to reflect the returned collection when an answer arrives.
        //   This returns a Promise, that resolves to result.
        //   *The resulting objects are tracked with referer, if there is one.*
        // result: PersistentObjectStore|Observable(PersistentObjectStore)
        //   Mandatory. When the promise is resolved, it will contain exactly the objects that were returned.
        // url: String
        //   Mandatory.
        // query: Object?
        //   Optional. The semantics of these parameters are left to the server.
        // referer: Object?
        //   Optional. This object will be used as referer in the _Cache for objects revived in the result.
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
        // this._c_pre(function() {return result && result.isInstanceOf && result.isInstanceOf(StoreOfStateful);});
        this._c_pre(function() {return js.typeOf(url) === "string";});
        this._c_pre(function() {return !query || js.typeOf(query) === "object";});

        logger.debug("GET URL is: " + url);
        logger.debug("query: " + query);
        var self = this;
        var loadPromise = request(
          url,
          {
            method:"GET",
            handleAs:"json",
            query:query,
            headers:{"Accept":"application/json"},
            withCredentials: true,
            timeout: this.timeout
          }
        );
        var revivePromise = loadPromise.then(
          function(/*Array*/ data) {
            if (js.typeOf(data) !== "array") {
              throw new Error("expected array from remote call");
            }
            logger.debug("Retrieved successfully from server: " + data.length + " items");
            // the then Promise resolves with the resolution of the revive Promise, an Array
            return self.revive(data, referer, self); // return Promise
          },
          function(err) {
            throw self._handleException(err); // of the request
          }
        );
        // no need to handle errors of revive: they are errors
        var storePromise = revivePromise.then(function(/*Array*/ revived) {
          if (js.typeOf(revived) !== "array") {
            throw new Error("expected array from remote call");
          }
          var removed = result.loadAll(revived);
          removed.forEach(function(r) {
            self.stopTracking(r, referer);
          });
          return result; // return PersistentObjectStore|Observable(PersistentObjectStore)
        });
        storePromise.then(lang.hitch(this, this._optionalCacheReporting));
        return storePromise; // return Promise
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

        logger.debug("Requested " + method + " of: " + po);
        var url = this.urlBuilder.get(method)(po.get("persistenceType"), po.get("persistenceId"));
        logger.debug(method + " URL is: " + url);
        var self = this;
        var loadPromise = request(
          url,
          {
            method: method,
            handleAs: "json",
            data: JSON.stringify(po),
            headers: {"Accept" : "application/json"},
            withCredentials: true,
            timeout: this.timeout
          }
        );
        var revivePromise = loadPromise.then(
          function(data) {
            logger.debug("Create succes in server: " + data);
            return self.revive(data, referer, self);
          },
          function(err) {
            throw self._handleException(err); // of the request
          }
        );
        // no need to handle errors of revive: they are errors
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
        revivePromise.then(lang.hitch(this, this._optionalCacheReporting));
        return revivePromise;
      },

      isOperational: function() {
        return this.urlBuilder && this.revive;
      },

      getCachedByTypeAndId: function(/*String*/ serverType, /*Number*/ persistenceId) {
        // summary:
        //   gets a cached PersistentObject by serverType and id
        //   returns undefined or null if there is no such entry
        this._c_pre(function() {return js.typeOf(serverType) === "string";});
        // IDEA subtype of PersistentObject
        this._c_pre(function() {return js.typeOf(persistenceId) === "number";});

        return this._cache.getByTypeAndId(serverType, persistenceId);
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

        this._cache.track(po, referrer); // TODO or store? not needed?
        this._optionalCacheReporting();
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
        this._optionalCacheReporting();
      },

      stopTrackingAsReferer: function(/*Any*/ referer) {
        this._c_pre(function() {return referer;});

        this._cache.stopTrackingAsReferer(referer);
        this._optionalCacheReporting();
      },

      // _retrievePromiseCache: Object
      //   This hash avoids loading the same object twice at the same time.
      _retrievePromiseCache: null,

      retrieve: function(/*String*/ serverType, /*Number*/ persistenceId, /*Any*/ referer, /*Boolean*/ force) {
        // summary:
        //   Get the object of type `serverType` with `persistenceId` from the remote server.
        //   This returns a Promise.
        // description:
        //   First we try to find the object in the cache. If we do find it, we check
        //   whether it was reloaded recently. If so, we return a Promise for this object
        //   that resolves immediately, and do not contact the server, unless force is true.
        //
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
        this._c_pre(function() {return js.typeOf(serverType) === "string";});
        this._c_pre(function() {return js.typeOf(persistenceId) === "number";});
        this._c_pre(function() {return js.typeOf(referer) === "object";});

        logger.debug("Requested GET of: '" + serverType + "' with id '" + persistenceId + "'");
        var retrievePromiseCacheKey = serverType + "@" + persistenceId;
        if (this._retrievePromiseCache[retrievePromiseCacheKey]) {
          logger.debug("Already loading " + retrievePromiseCacheKey + "; returning existing promise.");
          return this._retrievePromiseCache[retrievePromiseCacheKey];
        }
        if (!force) {
          var cached = this.getCachedByTypeAndId(serverType, persistenceId);
          if (cached) {
            logger.debug("Found cached version; resolving Promise immediately (" + serverType + "@" + persistenceId + ")");
            var deferred = new Deferred();
            this._retrievePromiseCache[retrievePromiseCacheKey] = deferred.promise;
            deferred.resolve(cached);
          }
        }
        if (!cached || (Date.now() - cached.lastReloaded.getTime() > CrudDao.durationToStale)) { // not recently reloaded
          var url = this.urlBuilder.retrieve(serverType, persistenceId);
          logger.debug("GET URL is: " + url);
          var self = this;
          var loadPromise = request(
            url,
            {
              method: "GET",
              handleAs: "json",
              headers: {"Accept" : "application/json"},
              preventCache: true,
              withCredentials: true,
              timeout: this.timeout
            }
          );
          var revivePromise = loadPromise.then(
            function(data) {
              logger.debug("Retrieved successfully from server: " + data);
              var revivePromise = self.revive(data, referer, self);
              delete self._retrievePromiseCache[retrievePromiseCacheKey];
              return revivePromise;
            },
            function(err) {
              delete self._retrievePromiseCache[retrievePromiseCacheKey];
              throw self._handleException(err); // of the request
            }
          );
          // no need to handle errors of revive: they are errors
          if (!cached) {
            this._retrievePromiseCache[retrievePromiseCacheKey] = revivePromise;
          }
        }
        else {
          logger.debug("Cached version was recently reloaded; will do no server interaction (" + retrievePromiseCacheKey + ")");
        }
        this._retrievePromiseCache[retrievePromiseCacheKey].then(lang.hitch(this, this._optionalCacheReporting));
        return this._retrievePromiseCache[retrievePromiseCacheKey];
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

      retrieveToMany: function(/*Observable(PersistentObjectStore)*/ result, /*PersistentObject*/ po, /*String*/ serverPropertyName) {
        // summary:
        //   Load the objects of a to-many relationship from the remote server.
        //   These are the many objects of `po[serverPropertyName]`.
        //   This returns the Promise of a filled-out `result`.
        //   The resulting objects are tracked, with the `result` as referer.
        // result: Observable(PersistentObjectStore)
        //   Resulting objects are loaded in this store. If they already there, they are reloaded.
        //   Objects that are not in the response from the server are removed. Objects that appear
        //   in the server response, that are not already in the store, are added. The store sends
        //   events for all changes.
        //   Finally, the returned Promise resolves to this object.
        // po: PersistentObject
        //   po should be in the cache beforehand
        // serverPropertyName: String
        //   The name of the to-many property in server lingo.
        // description:
        //   Asynchronously, we get up-to-date content from the server, and will
        //   update the content of the store when the server returns a response.
        //   The store will send events (if reload is implemented correctly).
        //
        //   The remote retrieve might fail, with an error, or an `IdNotFoundException`, or a
        //   `SecurityException`.
        //   TODO find a way to signal this as a state of the StoreOfStateful
        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return result && result.isInstanceOf;});
// Cannot really formulate what we want, because of stupid Observable Store wrapper
//        this._c_pre(function() {return result && result.isInstanceOf && result.isInstanceOf(PersistentObjectStore);});
        this._c_pre(function() {return po && po.isInstanceOf && po.isInstanceOf(PersistentObject);});
        // po should be in the cache, but we don't enforce it; your problem
        this._c_pre(function() {return js.typeOf(serverPropertyName) === "string";});

        logger.debug("Requested GET of to many: '" + po + "[" + serverPropertyName+ "]'");
        var url = this.urlBuilder.toMany(po.get("persistenceType"), po.get("persistenceId"), serverPropertyName);
        var resultPromise = this._refresh(result, url, null, result); // IDEA: we can even add a query here
        return resultPromise; // return Promise
      },

      retrieveToMany2: function(/*PersistentObject*/ po, /*String*/ propertyName) {
        // summary:
        //   Load the objects of a to-many relationship from the remote server.
        //   These are the many objects of `po[propertyName]`.
        //   This returns the Promise of the filled-out Observable(PersistentObjectStore) found at `po[propertyName]`.
        //   The resulting objects are tracked, with the `po[propertyName]` as referer.
        // po: PersistentObject
        //   po should be in the cache beforehand
        // serverPropertyName: String
        //   The name of the to-many property of `po`.
        // description:
        //   Asynchronously, we get up-to-date content from the server, and will
        //   update the content of the store when the server returns a response.
        //   The store will send events (if reload is implemented correctly).
        //
        //   This code expects to find at `po[propertyName]` an Observable ToManyStore.
        //   We use the store we find.
        //
        //   The remote retrieve might fail, with an error, or an `IdNotFoundException`, or a
        //   `SecurityException`.
        //   TODO find a way to signal this as a state of the StoreOfStateful

        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return po && po.isInstanceOf && po.isInstanceOf(PersistentObject);});
        // po should be in the cache, but we don't enforce it; your problem
        this._c_pre(function() {return js.typeOf(propertyName) === "string";});
        this._c_pre(function() {return po[propertyName] && po[propertyName].query});
//        this._c_pre(function() {return po[propertyName] && po[propertyName].isInstanceOf && po[propertyName].isInstanceOf(ToManyStore)});
        // Cannot really formulate what we want, because of stupid Observable Store wrapper

        var self = this;
        logger.debug("Requested GET of to many: '" + po + "[" + propertyName+ "]'");
        var store = po[propertyName];
        var url = self.urlBuilder.toMany(po.get("persistenceType"), po.get("persistenceId"), store.serverPropertyName);
        logger.debug("Refreshing to many store for " + po + "[" + propertyName+ "]");
        var guardedPromise = store._arbiter.guard(
          store,
          function() { // return Promise
            var retrievePromise = self._refresh(store, url, null, store); // IDEA: we can even add a query here
            var donePromise = retrievePromise.then(
              function(result) {
                logger.debug("To-many store for " + po + "[" + propertyName+ "] refreshed.");
                result.set("lastReloaded", new Date());
                return result;
              },
              function(err) {
                console.error("Failed to refresh store for " + po + "[" + propertyName+ "]", err);
                throw err;
              }
            );
            return donePromise; // return Promise
          },
          true
        );
        return guardedPromise;
      },

      searchInto: function(/*PersistentObjectStore*/ result, /*String?*/ serverType, /*Object?*/ query) {
        // summary:
        //   Get all the objects of type `serverType` given the query from the remote server,
        //   and update `result` to reflect the returned collection when an answer arrives.
        //   This returns a Promise, that resolves to result.
        //   *The resulting objects are not tracked.*
        // result: PersistentObjectStore
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
        this._c_pre(function() {return !serverType || js.typeOf(serverType) === "string";});
        this._c_pre(function() {return !query || js.typeOf(query) === "object";});

        logger.debug("Requested GET of matching instances: '" + serverType +"' matching '" + query + "'");
        var url = this.urlBuilder.search(serverType, query);
        var resultPromise = this._refresh(result, url, query, null); // no referer
        resultPromise.then(lang.hitch(this, this._optionalCacheReporting));
        return resultPromise; // return Promise
      },

      retrieveAllPersistenceIds: function(/*String*/ serverType) {
        // summary:
        //   Returns the Promise of an array with all the persistenceIds that
        //   exist for the given serverType.
        this._c_pre(function() {return js.typeOf(serverType) === "string";});

        logger.debug("Requested GET of all persistenceIds of " + serverType);
        var url = this.urlBuilder.allPersistenceIds(serverType);
        var loadPromise = request(
          url,
          {
            method:"GET",
            handleAs:"json",
            headers:{"Accept":"application/json"},
            preventCache: true,
            withCredentials: true,
            timeout: this.timeout
          }
        );
        loadPromise.then(lang.hitch(this, this._optionalCacheReporting));
        return loadPromise; // return Promise
      }

    });

    CrudDao.durationToStale = 60000; // 1 minute

    return CrudDao; // return Function
  }
);
