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
        "ppwcode-util-contracts/_Mixin",
        "./UrlBuilder", "./PersistentObject", "./IdNotFoundException", "ppwcode-vernacular-exceptions/SecurityException", "./ObjectAlreadyChangedException",
        "dojo/Deferred", "dojo/request", "dojo/_base/lang", "ppwcode-util-oddsAndEnds/js", "dojo/topic",
        "dojo/has", "dojo/promise/all", "ppwcode-util-oddsAndEnds/log/logger!", "module"],
  function(declare,
           _ContractMixin,
           UrlBuilder, PersistentObject, IdNotFoundException, SecurityException, ObjectAlreadyChangedException,
           Deferred, request, lang, js, topic,
           has, all, logger, module) {

    //noinspection MagicNumberJS
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
      /* IDEA detect we are on older hardware, and set it to 10 then; e.g., count to 1 000 000, and depending on the
         speed ... */

      // maxConcurrentRequests: Number
      //   The maximum number of concurrent connections. Later requests will be queued, and handled when earlier
      //   requests finish.
      maxConcurrentRequests: 16,
      // any lower limit makes Chrome slower! this is introduced for eopdf

      // _numberOfExecutingRequests: Number
      //   The number of requests currently executing.
      _numberOfExecutingRequests: 0,

      // _queuedRequests: Function[]
      //    Requests waiting for execution, because there are too many concurrent requests already.
      _queuedRequests: null,

      // urlBuilder: UrlBuilder
      urlBuilder: null,

      // revive: Function
      //   Object x Object -> Object|Promise of Object
      //   Function that returns the Promise of a revived object graph, based on an
      //   object tree (intended to be parsed JSON) of which the objects are to be reloaded
      //   in PersistentObjects, new or found in the cache of CrudDao. Objects are added to the cache
      //   of the given CrudDao with the second argument as referer on the first level, and the
      //   resulting PersistentObjects as referer for PersistentObject further down in the tree.
      //   As this might require module loading, the result might be a Promise.
      revive: null,

      // cache: _Cache
      //   Hash that stores all tracked objects and stores, using a cacheKey
      //   Contains an entry for each retrieved object, that is not yet released.
      cache: null,

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
          //noinspection JSUnresolvedVariable
          this._cacheReportingTimer = setTimeout(lang.hitch(this.cache, this.cache.report), value);
        }
      },

      _optionalCacheReporting: function() {
        if (this._cacheReportingPeriod === 0) {
          //noinspection JSUnresolvedFunction
          console.info(this.cache.report());
        }
      },

      _copyKwargsProperties: function(kwargs, propertyNames) {
        var self = this;
        if (kwargs) {
          propertyNames.
            filter(function(pName) {return kwargs[pName];}).
            forEach(function(pName) {self[pName] = kwargs[pName];});
        }
      },

      constructor: function(kwargs) {
        this._copyKwargsProperties(kwargs, ["urlBuilder", "revive", "cache", "replacer", "timeout"]);
        this.setCacheReportingPeriod(has(module.id + "-cacheReporting"));
        this._retrievePromiseCache = {};
        this._queuedRequests = [];
      },

      handleNotAuthorized: function() {
        // summary:
        //   Some browsers do not present a log-in dialog when an AJAX call returns a 401.
        //   This function says what we do then.
        //   This cannot be implemented in general, but subclasses can provide an override.

        logger.debug("handleNotAuthorized called.");
      },

      _handleException: function(exc, contextDescription) {
        // summary:
        //   Triage and handle `exc`.
        //   This method does not throw exceptions itself, but translates `exc` into another exception
        //   that will be thrown if that is applicable, or return the original exc to be thrown. It always
        //   returns an exception to be thrown.

        // TODO function too complex; refactor

        if (!exc) {
          logger.error("Asked to handle an exception, but there is none (" + contextDescription + ").");
          return undefined;
        }
        if (exc.dojoType === "cancel") {
          logger.info("Remote action cancelled (" + contextDescription + ").");
          /*
           We might want to eat this exception: it is not a problem; the Promise is cancelled.
           However, it seems to be the only way to signal cancellation reliably. dgrid e.g.
           uses it.
           So we only don't log it as an error.
           */
          return exc;
        }
        if (exc.response) {
          //noinspection MagicNumberJS
          if (exc.response.status === 401 || (has("trident") && exc.response.status === 0)) {
            // Normally, we should not get a 401. The browser should present a login dialog to the user.
            // Not all browsers do that, though, for AJAX requests. In those cases, we detect it,
            // and handle it ourselves in some way. E.g., change the window location
            // to a server login page, that redirects here again after successful login.
            // ie ("trident") has issues with a 401; this is a workaround, that will result in infinite reloads if
            // something truly bad happens
            logger.info("Not authorized leaked through (" + contextDescription + ").", exc);
            this.handleNotAuthorized(); // this method might do a redirect, so it might not return
            return exc; // we may not get here
          }
          //noinspection MagicNumberJS
          if (exc.response.status === 404) {
            var kwargs = {cause: exc.response.data};
            if (exc.response.data && exc.response.data["$type"] && exc.response.data["$type"].indexOf) {
              if (exc.response.data["$type"].indexOf("PPWCode.Vernacular.Persistence.I.Dao.IdNotFoundException") >= 0) {
                // NOTE: sic! Yes, there is a typo in the server code (missing "t" in "persistenObjectType")
                //noinspection JSUnresolvedVariable
                kwargs.serverType = exc.response.data.Data.persistenObjectType;
                /* getting the typeDescription in general needs a require, and thus is async. We do not want to do that
                   here. */
                //noinspection JSUnresolvedVariable
                kwargs.persistenceId = exc.response.data.Data.persistenceId;
              }
            }
            var infExc = new IdNotFoundException(kwargs);
            logger.info("Not found (" + contextDescription + "): ", infExc);
            return infExc;
          }
          if (exc.response.data && exc.response.data["$type"] && exc.response.data["$type"].indexOf) {
            if (exc.response.data["$type"].indexOf("PPWCode.Vernacular.Persistence.I.Dao.DaoSecurityException") >= 0) {
              logger.warn("Server reported dynamic security exception (" + contextDescription + ").", exc.response.data);
              return new SecurityException({cause: exc.response.data});
            }
            if (exc.response.data["$type"].indexOf("PPWCode.Vernacular.Persistence.I.Dao.ObjectAlreadyChangedException") >= 0) {
              logger.info("Server reported object already changed (" + contextDescription + ").", exc.response.data);
              //noinspection JSUnresolvedVariable
              return new ObjectAlreadyChangedException({
                cause: exc.response.data,
                newVersion: exc.response.data && exc.response.data.Data && exc.response.data.Data.sender
              });
            }
          }
          //noinspection MagicNumberJS
          if (exc.response.status === 500) {
            logger.error("Server reported internal error (" + contextDescription + ").");
          }
          else {
            logger.error("Server reported untriaged error (" + contextDescription + ").");
          }
          if (exc.response.status) {
            logger.error("Response status: ", exc.response.status);
          }
          if (exc.response.data) {
            logger.error("Response data: ", JSON.stringify(exc.response.data));
          }
          else if (exc.response.text) {
            logger.error("Response text: ", exc.response.text);
          }
        }
        logger.error("Unhandled exception (" + contextDescription + "): ", exc);
        return exc;
      },

      _queued: function(/*Function*/ promiseFunction) {

        function actualCall() {

          function requestDone() {
            self._numberOfExecutingRequests--;
            var nextRequest = self._queuedRequests.shift(); // fifo
            if (nextRequest) {
              nextRequest.call(this);
            }
          }

          self._numberOfExecutingRequests++;
          var done = promiseFunction.call();
          return done.then(
            function(result) {
              requestDone();
              return result;
            },
            function(err) {
              requestDone();
              throw err;
            }
          );
        }


        var self = this;

        if (self._numberOfExecutingRequests < self.maxConcurrentRequests) {
          logger.debug("Concurrent requests: " + self._numberOfExecutingRequests + " (max " +
                       self.maxConcurrentRequests + ") - not queueing this request");
          return actualCall();
        }
        logger.info("Reached maximum number of concurrent requests (max " + self.maxConcurrentRequests +
                    ") - queueing this request (" + self._queuedRequests.length + " pending already)");
        // queue the request for later; return a Promise for the Promise
        var deferred = new Deferred();
        self._queuedRequests.push(
          function() {
            logger.info("Starting queued request. (" + self._queuedRequests.length + " left in queue)");
            var done = actualCall();
            done.then(
              function(result) {
                logger.debug("Queued request ended nominally.");
                deferred.resolve(result);
              },
              function(err) {
                logger.error("Queued request ended with an error.");
                deferred.reject(err);
              }
            );
          }
        ); // fifo
        return deferred.promise;
      },

      _refresh: function(/*PersistentObjectStore|Observable(PersistentObjectStore)*/ result,
                         /*String*/ url,
                         /*Object?*/ query,
                         /*Object?*/ referer,
                         /*Object?*/ options) {
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
        // options: Object?
        //   Optional options object. We only use the paging settings:
        //   - options.start: Number?: The index of the first result we expect. Default is 0 (0-based counting)
        //   - options.count: Number?: The number of objects we request, starting from `start`. The server might return less,
        //                             if there are no more, or if it decides to return less (e.g., because the server
        //                             return count is capped to a lower number). Default is as many as possible.
        //   We expect a consistent sorting order on the server for paging.
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
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable
          return result && result.isInstanceOf;
        });
        // Cannot really formulate what we want, because of stupid Observable Store wrapper
        // this._c_pre(function() {return result && result.isInstanceOf && result.isInstanceOf(StoreOfStateful);});
        this._c_pre(function() {return js.typeOf(url) === "string";});
        this._c_pre(function() {return !query || js.typeOf(query) === "object";});
        this._c_pre(function() {return !options || js.typeOf(options) === "object";});
        this._c_pre(function() {return !options || !options.start || js.typeOf(options.start) === "number";});
        this._c_pre(function() {return !options || !options.count || js.typeOf(options.count) === "number";});

        logger.debug("GET URL is: " + url);
        logger.debug("query: " + query);
        var self = this;
        var headers = {"Accept": "application/json"};
        if (options && (options.start >= 0 || options.count >= 0)) {
          var rangeStart = options.start || 0;
          var rangeEnd = (options.count && options.count !== Infinity) ? (rangeStart + options.count - 1) : "";
          headers["Range"] = "items=" + rangeStart + "-" + rangeEnd;
          //set X-Range for Opera since it blocks "Range" header (source: JsonRest)
          headers["X-Range"] = headers["Range"];
        }
        var loadPromise = request(
          url,
          {
            method: "GET",
            handleAs: "json",
            query: query,
            headers: headers,
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
            return self.revive(data, referer); // return Promise
          },
          function(err) {
            throw self._handleException(err, "_refresh - GET " + url); // of the request
          }
        );
        var totalPromise = loadPromise.response.then(
          function(response) {
            /*
             On response, we will read the "Content-Range" header.
             Security prohibits us from doing that, if the header is not mentioned in the "Access-Control-Expose-Headers" of the
             response. For that, we have to add it to the "Access-Control-Expose-Headers" on the server.
             */
            var range = response.getHeader("Content-Range");
            //noinspection AssignmentResultUsedJS
            return range && (range = range.match(/\/(.*)/)) && +range[1]; // nicked from JsonRest
          }
          // error handling in the other flow
        );
        // IDEA this approach freezes the UI in dgrid
        // Better would be to revive the elements of the array separately,
        // get a promise for each, and add to the store one at a time.
        // But that is not the same as loadAll, which also removes stuff _not_ in the server result.
        // Furthermore, then we don't use the feature that common secondary objects are only reloaded once.

        // no need to handle errors of revive: they are errors
        var storePromise = revivePromise.then(function(/*Array*/ revived) {
          if (js.typeOf(revived) !== "array") {
            throw new Error("expected array from remote call");
          }
          //noinspection JSUnresolvedFunction
          var removed = result.loadAll(revived);
          /* Elements might be not PersistentObjects themselves, but a hash of PersistentObjects.
             If the element is an Object, but not a PersistentObject, we will try the properties of the object
             for PersistentObjects, and stop tracking those. */
          removed.forEach(function stopTrackingRecursive(r) {
            if (r && r.isInstanceOf && r.isInstanceOf(PersistentObject)) {
              if (referer) {
                self.stopTracking(r, referer);
              }
            }
            else if (js.typeOf(r) === "array") {
              r.forEach(function(el) {stopTrackingRecursive(el);});
            }
            else if (js.typeOf(r) === "object") {
              js.getAllKeys(r).forEach(function(key) {stopTrackingRecursive(r[key]);});
            }
            // else nop
          });
          //noinspection JSUndefinedPropertyAssignment
          result.total = totalPromise; // piggyback total promise on the store too
          return result; // return PersistentObjectStore|Observable(PersistentObjectStore)
        });
        // piggyback total promise on final Promise; since Promise is sealed, we need a delegate
        // remember that the Promise returns the store, not the array
        var finalPromise = lang.delegate(storePromise, {total: totalPromise});
        finalPromise.then(lang.hitch(this, this._optionalCacheReporting));
        return finalPromise; // return Promise
      },

      replacer: function(/*String*/ key, value) {
        // summary:
        //   When JSON-stringifying objects, this function is used as replacer
        //   (see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
        //   and http://jsfiddle.net/jandockx/BAzdq/).
        //   The this object is the object being stringified. First, we get an empty key, and the result
        //   of the object's `toJSON` as a whole, next, we get all properties of the result of this first call,
        //   as key-value pairs. The actual JSON value is what we return for each key.
        //   Inserting information thus can be done on the first call with the empty key, and can be based
        //   on the original object (this).
        // description:
        //   The default implementation always returns `value`, which essentially means it does nothing apart
        //   from using electricity.

        return value;
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
        //
        //   Revive is also used for delete, although the deleted object cannot be found in the cache,
        //   since the JSON has no persistenceId anymore. This however will reload potential related
        //   objects.
        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return method === "POST" || method === "PUT" || method === "DELETE";});
        this._c_pre(function() {return po;});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return po.isInstanceOf && po.isInstanceOf(PersistentObject);
        });

        logger.debug("Requested " + method + " of: " + po);
        var url = this.urlBuilder.get(method)(po);
        logger.debug(method + " URL is: " + url);
        var self = this;
        var loadPromise = request(
          url,
          {
            method: method,
            handleAs: "json",
            data: JSON.stringify(po, this.replacer),
            headers: {"Accept" : "application/json"},
            withCredentials: true,
            timeout: this.timeout
          }
        );
        var revivePromise = loadPromise.then(
          function(data) {
            logger.debug(method + " success in server: " + data);
            return self.revive(data, referer);
          },
          function(err) {
            throw self._handleException(err, "_poAction - " + method + " " + url); // of the request
          }
        );
        // no need to handle errors of revive: they are errors
        // MUDO: when we get an IdNotFoundException
        revivePromise.then(lang.hitch(this, this._optionalCacheReporting));
        revivePromise.then(function(revived) {
          topic.publish(
            module.id,
            {
              action: method,
              persistentObject: revived
            }
          );
        });
        return revivePromise;
      },

      isOperational: function() {
        return this.urlBuilder && this.revive && this.cache;
      },

      getCachedByTypeAndId: function(/*String*/ serverType, /*Number*/ persistenceId) {
        // summary:
        //   gets a cached PersistentObject by serverType and id
        //   returns undefined or null if there is no such entry
        this._c_pre(function() {return js.typeOf(serverType) === "string";});
        // IDEA subtype of PersistentObject
        this._c_pre(function() {return js.typeOf(persistenceId) === "number";});

        //noinspection JSUnresolvedFunction
        return this.cache.getByTypeAndId(serverType, persistenceId);
      },

      track: function(/*PersistentObject*/ po, /*Object*/ referrer) {
        // summary:
        //   After this call, po will be in the cache, and be tracked by referrer.
        // description:
        //   If it was not in the cache yet, it is added, and referrer is added as referrer.
        //   If it was already in the cache, referrer is added as referrer.
        //   Since the referrers of a cache are a Set, there will be no duplicate entries.
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return po && po.isInstanceOf && po.isInstanceOf(PersistentObject);
        });
        this._c_pre(function() {return referrer;});

        //noinspection JSValidateTypes
        this.cache.track(po, referrer); // TODO or store? not needed?
        this._optionalCacheReporting();
      },

      stopTracking: function(/*PersistentObject*/ po, /*Object*/ referer) {
        // summary:
        //   We note that referer no longer uses po.
        // description:
        //   If referer was the last referer of po, po is removed from the cache.
        //   If po is removed from the cache, it is also removed as a referer
        //   of all other entries (potentially resulting in removal from the cache
        //   of that entry, recursively).
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return po && po.isInstanceOf && po.isInstanceOf(PersistentObject);
        });
        this._c_pre(function() {return referer;});

        //noinspection JSUnresolvedFunction
        this.cache.stopTracking(po, referer);
        this._optionalCacheReporting();
      },

      stopTrackingAsReferer: function(/*Any*/ referer) {
        this._c_pre(function() {return referer;});

        //noinspection JSUnresolvedFunction
        this.cache.stopTrackingAsReferer(referer);
        this._optionalCacheReporting();
      },

      // _retrievePromiseCache: Object
      //   This hash avoids loading the same object twice at the same time.
      _retrievePromiseCache: null,

      retrieve: function(/*String*/ serverType, /*Number*/ persistenceId, /*Object?*/ referer, /*Boolean*/ force) {
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
        //   PersistentObjects and StoreOfStateful instances the main object refers to,
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
        this._c_pre(function() {return !referer || js.typeOf(referer) === "object";});

        var /*CrudDao*/ self = this;
        logger.debug("Requested GET of: '" + serverType + "' with id '" + persistenceId + "'");
        var cacheKey = serverType + "@" + persistenceId;
        //noinspection JSUnresolvedVariable
        var /*Promise*/ resultPromise = self._retrievePromiseCache[cacheKey];
        if (resultPromise) {
          logger.debug("Already loading " + cacheKey + "; returning existing promise.");
          return resultPromise;
        }
        //noinspection JSUnresolvedFunction
        var cached = self.getCachedByTypeAndId(serverType, persistenceId);
        if (cached) {
          logger.debug("Found cached version (" + cacheKey + ")");
          if (referer) {
            // track now, early; if we wait until reload, it might be removed from the cache already
            //noinspection JSUnresolvedFunction
            self.track(cached, referer);
            /* TODO this needs to be guarded?; referer might stop tracking before the reload Promise resolves;
             that results in a memory leak? */
          }
          if (!force) {
            logger.debug("Found cached version, and should not be forced: resolving Promise immediately " +
                         "(will reload if stale) (" + cacheKey + ")");
            var deferred = new Deferred();
            deferred.resolve(cached);
            resultPromise = deferred.promise;
          }
        }
        //noinspection JSUnresolvedVariable
        var stale = cached && (Date.now() - cached.lastReloaded.getTime() > CrudDao.durationToStale);
        if (force || !cached || stale) { // not recently reloaded
          logger.debug("Force reload requested, not found in cache or cached version is stale. " +
                       "Getting '" + serverType + "' with id '" + persistenceId + "' from server.");
          //noinspection JSUnresolvedVariable
          var url = self.urlBuilder.retrieve(serverType, persistenceId);
          logger.debug("GET URL is: " + url);
          //noinspection JSUnresolvedFunction
          var executed = self._queued(function() {
            //noinspection JSUnresolvedVariable
            var loadedAndRevived = request(
              url,
              {
                method: "GET",
                handleAs: "json",
                headers: {"Accept": "application/json"},
                preventCache: true,
                withCredentials: true,
                timeout: self.timeout
              }
            ).otherwise(function(err) {
              //noinspection JSUnresolvedFunction
              var exc = self._handleException(err, "retrieve - GET " + url); // of the request
              if (exc.isInstanceOf
                  && exc.isInstanceOf(IdNotFoundException)
                  // cannot test servertype: the exception from the server always reports IPersistentObject
                  && exc.persistenceId === persistenceId) {
                logger.debug("IdNotFoundException while retrieving " + cacheKey);
                if (cached) {
                  logger.debug("We have a cached version. Cleaning up.");
                  //noinspection JSUnresolvedFunction
                  self._cleanupAfterRemove(cached);
                }
              }
              throw exc;
            }).then(function(data) {
              logger.debug("Retrieved successfully from server (" + cacheKey + ")");
              //noinspection JSUnresolvedFunction
              return self.revive(data, referer); // errors are true errors
            });
            //noinspection JSUnresolvedVariable
            loadedAndRevived.then(lang.hitch(self, self._optionalCacheReporting)); // side track
            // no need to handle errors of revive: they are errors
            return loadedAndRevived;
          });
          executed.always(function(po) { // side track, always
            logger.debug("Retrieve finalized. Forgetting the retrieve Promise (" + cacheKey + ")");
            //noinspection JSUnresolvedVariable
            delete self._retrievePromiseCache[cacheKey];
          });
          //noinspection JSUnresolvedVariable
          self._retrievePromiseCache[cacheKey] = executed;
          resultPromise = resultPromise || executed;
        }
        /*
         !!resultPromise
         === (cached && !force) || (force || !cached || stale)
         === (cached || force || !cached || stale) && (!force || force || !cached || stale)
         === (force || stale || true) && (!cached || stale || true)
         === true && true
         === true
         */
        return resultPromise;
      },

      create: function(/*PersistentObject*/ po, /*Any*/ referer) {
        // summary:
        //   Ask the server to create po.
        //   Returns a Promise for a fresh object that is tracked with referer as the first referer.
        //   The original object should be discarded.
        // description:
        //   po must have po.get("persistenceId") === null on call.
        //   The promise returns a fresh object after reload.
        //   The caller has a reference to po, but this should be discarded on Promise fulfilment, and replaced
        //   with the result.
        //   IDEA We could change the code to reuse po, but the issue is that po could contain references to other
        //   objects that need to be created too, and the reviver currently has no mechanism to do that, but it is
        //   an interesting idea.
        //
        //   If anything fails during the request or revival of the response,
        //   the errback of the Promise is called with the exception. This can be a SemanticException.
        //   All other kinds of exceptions or value are to be considered errors.
        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return po;});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return po.isInstanceOf && po.isInstanceOf(PersistentObject);
        });
        this._c_pre(function() {
          //noinspection JSUnresolvedFunction
          return po.get("persistenceId") === null;
        });
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
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return po.isInstanceOf && po.isInstanceOf(PersistentObject);
        });
        this._c_pre(function() {
          //noinspection JSUnresolvedFunction
          return po.get("persistenceId");
        });

        return this._poAction("PUT", po);
      },

      _cleanupAfterRemove: function(/*PersistentObject*/ po) {
        // summary:
        //   The rest of the graph returned by the server cannot be trusted to be up to date after delete.
        //   The server might have cascaded delete. Related objects on this side could still hold a reference
        //   to the deleted object, which is removed in the mean time in the server.
        //   Therefor, we do not revive the result, but instead stop tracking po, and retrieve fresh data
        //   for all related elements if they are still cached.
        this._c_pre(function() {return po;});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return po.isInstanceOf && po.isInstanceOf(PersistentObject);
        });

        var self = this;
        //noinspection JSUnresolvedFunction
        self.cache.stopTrackingCompletely(po);
        // signal deletion
        topic.publish(
          module.id,
          {
            action: "DELETE",
            persistentObject: po
          }
        );
        //noinspection JSUnresolvedFunction
        po._changeAttrValue("persistenceId", null);
        //noinspection JSUnresolvedFunction
        if (po.get("persistenceVersion")) {
          //noinspection JSUnresolvedFunction
          po._changeAttrValue("persistenceVersion", null);
        }
        //noinspection JSUnresolvedFunction
        if (po.get("createdBy")) {
          //noinspection JSUnresolvedFunction
          po._changeAttrValue("createdBy", null);
          //noinspection JSUnresolvedFunction
          po._changeAttrValue("createdAt", null);
        }
        //noinspection JSUnresolvedFunction
        if (po.get("lastModifiedBy")) {
          //noinspection JSUnresolvedFunction
          po._changeAttrValue("lastModifiedBy", null);
          //noinspection JSUnresolvedFunction
          po._changeAttrValue("lastModifiedAt", null);
        }
        return all(js.getAllKeys(po).filter(function(k) {
            return po[k] && po[k].isInstanceOf && po[k].isInstanceOf(PersistentObject) && po[k].get("persistenceId") && self.cache.get(po[k]);
          }).map(function(k) {
            // this will update object in cache, but don't add a referer for my sake,
            // and don't care about IdNotFoundExceptions (delete might have cascaded)
            var dependentPo = po[k];
            logger.debug("refreshing " + dependentPo + " after delete of " + po);
            return self.retrieve(dependentPo.getTypeDescription(), dependentPo.get("persistenceId"), null, true).then(
              function(result) {
                return result;
              },
              function(err) {
                return err; // no throw // TODO filter on serious exceptions
              }
            );
          })
        ).then(function() {
          logger.debug("All dependent objects refreshed. Delete done.");
          return po;
        });
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
        //   The rest of the graph returned by the server cannot be trusted to be up to date in this case.
        //   Therefor, we do not revive the result, but instead stop tracking po, and retrieve fresh data
        //   for all related elements if they are still cached.
        //
        //   The promise returns po after reload.
        //
        //   If anything fails during the request or revival of the response,
        //   the errback of the Promise is called with the exception. This can be a SemanticException.
        //   All other kinds of exceptions or value are to be considered errors.
        var thisObject = this;
        this._c_pre(function() {return thisObject.isOperational();});
        this._c_pre(function() {return po;});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return po.isInstanceOf && po.isInstanceOf(PersistentObject);
        });
        this._c_pre(function() {
          //noinspection JSUnresolvedFunction
          return po.get("persistenceId");
        });

        var self = this;
        logger.debug("Requested DELETE of: " + po);
        var url = self.urlBuilder.get("DELETE")(po);
        logger.debug("DELETE URL is: " + url);
        var deletePromise = request.del(
          url,
          {
            handleAs: "json",
            data: JSON.stringify(po, self.replacer),
            headers: {"Accept" : "application/json"},
            withCredentials: true,
            timeout: self.timeout
          }
        ).then(function(data) {
          logger.debug("DELETE success in server: " + data);
          return data;
        });
        var cleanupPromise = deletePromise.then(function(data) {
          //noinspection JSUnresolvedFunction
          self._cleanupAfterRemove(po);
        });
        var deleteDonePromise = cleanupPromise.otherwise(
          function(err) {
            //noinspection JSUnresolvedFunction
            throw self._handleException(err, "remove - DELETE " + url); // of the request
          }
        );
        return deleteDonePromise;
      },

      retrieveToMany: function(/*PersistentObject*/ po, /*String*/ propertyName, /*Object?*/ options) {
        // summary:
        //   Load the objects of a to-many relationship from the remote server.
        //   These are the many objects of `po[propertyName]`.
        //   This returns the Promise of the filled-out Observable(PersistentObjectStore) found at `po[propertyName]`.
        //   The resulting objects are tracked, with the `po[propertyName]` as referer.
        // po: PersistentObject
        //   po should be in the cache beforehand
        // serverPropertyName: String
        //   The name of the to-many property of `po`.
        // options: Object?
        //   Optional options object. We only use the paging settings:
        //   - options.start: Number?: The index of the first result we expect. Default is 0 (0-based counting)
        //   - options.count: Number?: The number of objects we request, starting from `start`. The server might return less,
        //                             if there are no more, or if it decides to return less (e.g., because the server
        //                             return count is capped to a lower number).
        //   We expect a consistent sorting order on the server for paging.
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

        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return po;});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return po.isInstanceOf && po.isInstanceOf(PersistentObject);
        });
        this._c_pre(function() {
          //noinspection JSUnresolvedFunction
          return po.get("persistenceId");
        });
        // po should be in the cache, but we don't enforce it; your problem
        this._c_pre(function() {return js.typeOf(propertyName) === "string";});
        this._c_pre(function() {return po[propertyName] && po[propertyName].query;});
        // this._c_pre(function() {return po[propertyName] && po[propertyName].isInstanceOf && po[propertyName].isInstanceOf(ToManyStore)});
        // Cannot really formulate what we want, because of stupid Observable Store wrapper

        //   TODO find a way to signal this as a state of the StoreOfStateful

        var self = this;
        logger.debug("Requested GET of to many: '" + po + "[" + propertyName+ "]'");
        var store = po[propertyName];
        //noinspection JSUnresolvedFunction
        var url = self.urlBuilder.toMany(po.getTypeDescription(), po.get("persistenceId"), store.serverPropertyName);
        //noinspection JSUnresolvedFunction
        var guardKey = po.getKey() + "." + propertyName;
        logger.debug("Refreshing to many store for " + guardKey);
        var guardedPromise = store._arbiter.guard(
          guardKey,
          lang.hitch(self, self._queued, lang.hitch(self, self._retrieveToMany, store, url, options, guardKey)),
          true
        );
        return guardedPromise;
      },

      _retrieveToMany: function(store, url, options, guardKey) { // return Promise
        var self = this;
        logger.debug("Starting actual GET of to many for" + guardKey + ".");
        var retrievePromise = self._refresh(store, url, null, store, options); // IDEA: we can even add a query here
        var donePromise = retrievePromise.then(
          function(result) {
            logger.debug("To-many store for " + guardKey + " refreshed.");
            result.set("lastReloaded", new Date());
            return result;
          },
          function(err) {
            throw self._handleException(err, "_retrieveToMany - GET " + url);
          }
        );
        return donePromise;
      },

      searchInto: function(/*PersistentObjectStore*/ result, /*String?*/ serverType, /*Object?*/ query, /*Object?*/ options) {
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
        // options: Object?
        //   Optional options object. We only use the paging settings:
        //   - options.start: Number?: The index of the first result we expect. Default is 0 (0-based counting)
        //   - options.count: Number?: The number of objects we request, starting from `start`. The server might return less,
        //                             if there are no more, or if it decides to return less (e.g., because the server
        //                             return count is capped to a lower number). Default is as many as possible.
        //   We expect a consistent sorting order on the server for paging.
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
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable
          return result && result.isInstanceOf;
        });
        // Cannot really formulate what we want, because of stupid Observable Store wrapper
        // this._c_pre(function() {return result && result.isInstanceOf && result.isInstanceOf(StoreOfStateful);});
        this._c_pre(function() {return !serverType || js.typeOf(serverType) === "string";});
        this._c_pre(function() {return !query || js.typeOf(query) === "object";});
        this._c_pre(function() {return !options || js.typeOf(options) === "object";});

        logger.debug("Requested GET of matching instances: '" + serverType +"' matching '" + query + "'");
        var url = this.urlBuilder.retrieveAll(serverType, query);
        var resultPromise = this._refresh(result, url, query, result, options); // no referer
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

    //noinspection MagicNumberJS
    CrudDao.durationToStale = 60000; // 1 minute
    CrudDao.mid = module.id;

    /*=====
    var Change = {

      // action: String
      //   The HTTP method that just concluded (POST, PUT or DELETE).
      action: false,

      // persistentObject: PersistentObject
      //   The revived PersistentObject that was a result of the action.
      persistentObject: burstStarted,
    };

    CrudDao.Change = Change;
    =====*/

    return CrudDao; // return Function
  }
);
