define(["dojo/_base/declare", "ppwcode/contracts/_Mixin",
        "./PersistentObject", "./IdNotFoundException",
        "ppwcode/collections/ArraySet",
        "dojo/request"],
  function(declare, _ContractMixin, PersistentObject, IdNotFoundException, Set, request) {

    function cacheKey(/*String*/ type, /*Number*/ persistenceId) {
      // summary:
      //   Returns a key.
      // description:
      //   Returns `type + "@" + persistenceId`

      return type + "@" + persistenceId;
    }

    function poCacheKey(/*PersistentObject*/ p) {
      // summary:
      //   Returns a key, intended to be unique, for this entry.
      // description:
      //   Returns `persistentObject.declaredClass + "@" + persistentObject.persistenceId`

      return cacheKey(p.declaredClass, p.persistenceId);
    }

    function declaredClass(/*Function*/ c) {
      var proto = c.prototype;
      return proto.declaredClass;
    }

    function isIdNotFoundException(/*String*/ error) {
      return error && error.isInstanceOf && error.isInstanceOf(IdNotFoundException);
      // MUDO probably not good enough; we need the header?
    }

    function isSemanticException(/*String*/ error) {
      return false; // MUDO unfinished
    }

    function createSemanticException(/*String*/ error) {
      return "SEMANTIC EXCEPTION"; // MUDO unfinished
    }

    var CacheEntry = declare([_ContractMixin], {
      // summary:
      //
      //   In the absence of some form of weak reference in JavaScript (promised for ECMAScript 6 / Harmony,
      //   see <http://wiki.ecmascript.org/doku.php?id=harmony:harmony>), we use reference tracking to be
      //   able to release instances from the cache.
      //   An entry in the cache holds the `PersistentObject`

      _c_invar: [
        function() {return this.hasOwnProperty("persistentObject");},
        function() {return this.persistentObject;},
        function() {return this.getKey();},
        function() {return this.getNrOfReferers() >= 0;}
      ],

      constructor: function(/*PersistentObject*/ p) {
        this._c_pre(function() { return p;});
        this._c_pre(function() { return p.isInstanceOf(PersistentObject);});

        this.persistentObject = p;
        this._referers = new Set();
      },

      // summary:
      //   Private. The set of referers.
      _referers: null,

      // summary:
      //   Reference to the persistent object this is an entry for.
      //   This can never change.
      persistentObject: null,

      getKey: function() {
        // summary:
        //   Returns a key, intended to be unique, for this entry.
        // description:
        //   Returns `persistentObject.declaredClass + "@" + persistentObject.persistenceId`

        return poCacheKey(this.persistentObject);
      },

      addReferer: function(referer) {
        // summary:
        //   Adds a referer to the set of referers. If referer is already
        //   in the set, nothing happens.
        // description:
        //   Referer can be anything, but usually it is a reference to
        //   the object holding a reference to `persistObject`, or otherwise
        //   responsible for maintaining this reference (i.e., releasing it
        //   when no longer needed, for garbage collection).
        this._c_pre(function() { return referer != null;});

        this._referers.add(referer);
      },

      removeReferer: function(referer) {
        // summary:
        //   Removes a referer from the set referers. If referer is
        //   not in the set to begin with, nothing happens.
        this._referers.remove(referer);
      },

      getNrOfReferers: function() {
        // summary:
        //   Return the number of referers.
        return this._referers.getSize();
      }

    });

    var CrudDao = declare([_ContractMixin], {
      // summary:
      //
      //   In the absence of some form of weak reference in JavaScript (promised for ECMAScript 6 / Harmony,
      //   see <http://wiki.ecmascript.org/doku.php?id=harmony:harmony>), we use reference tracking to be
      //   able to release instances from the cache.

      _c_invar: [
      ],

      constructor: function() {
        this.baseUrl = null;
        this._cache = {};
        this._errorCount = 0;
      },

      baseUrl: null,

      isOperational: function() {
        return this.baseUrl;
      },

      getUrl: function(/*Function*/PoType, /*Number*/ persistenceId) {
        var classAsPath = declaredClass(PoType).replace(/\./g, "/");
        var relativeObjectUri = persistenceId ?
          relativeObjectUri = classAsPath + "/" + persistenceId :
          classAsPath;
        var absoluteUrl = this.baseUrl + relativeObjectUri;
        return absoluteUrl;
      },

      // summary:
      //   The maximum number of consecutive communication errors before we call wolf.
      //   Default is 10.
      errorLimit: 10,

      // summary:
      //   Private. Counts the number of consecutive errors.
      _errorCount: null,

      _incrementErrorCount: function(/*Any*/ error, /*String*/ operationString) {
        this._errorCount++;
        console.warn("Communication error (" + this._errorCount + ") on " +
                    operationString + " (" + error + ")"); // log first
        if (this._errorCount > this.errorLimit) {
          throw "ERROR: got more than " + this.errorLimit + " consecutive communication errors.";
          // TODO Dialog, stop, quit
        }
      },

      _resetErrorCount: function() {
        this._errorCount = 0;
      },

      // summary:
      //   Private. Contains a CacheEntry for each retrieved object, that is not yet released.
      _cache: null,

      _getExistingCacheEntry: function(/*PersistentObject*/ p) {
        this._c_pre(function() {return p;});
        this._c_pre(function() {return p.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return p.get("persistenceId");});

        var entry = this._cache[poCacheKey(p)];
        if (!entry) {
          throw "ERROR: object not in CrudDao cache (" + p.toString() + ")";
        }
        return entry;
      },

      track: function(/*PersistentObject*/ p, /*Any*/ referrer) {
        var entry = this._cache[poCacheKey(p)];
        if (entry) {
          entry.addReferer(referrer);
        }
        else {
          entry = new CacheEntry(p);
          entry.addReferer(referrer);
          this._cache[entry.getKey()] = entry;
        }
      },

      stopTracking: function(/*PersistentObject*/ p, /*Any*/ referer) {
        this._c_pre(function() {return p;});
        this._c_pre(function() {return p.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return p.get("persistenceId") !== null});
        // TODO p is in cache

        var entry = this._getExistingCacheEntry(p);
        entry.removeReferer(referer);
        if (entry.getNrOfReferers() <= 0) {
          delete this._cache[entry.getKey()];
          console.trace("Entry removed from CrudDao cache: " + p.toString());
        }
      },

      _noLongerInServer: function(entry) {
        var key = entry.getKey();
        entry.persistentObject._changeAttrValue("persistenceId", null);
        delete this._cache[key];
      },

      get: function(/*Function*/ PoType, /*Number*/ persistenceId, /*Any*/ referer) {
        // summary:
        //   Get the object of type `PoType` with `persistenceId` from the remote server.
        // description:
        //   The object might be in the cache. If it is, it is returned immediately,
        //   and an update is started asynchronuously. On successful return of the
        //   retrieval call, the object is reloaded with the new data. It will send
        //   events if properties are changed as a `Stateful` object. `referer` is added
        //   as referer for the object.
        //   If the object is not in the cache, a `Promise` is returned. On succesful
        //   return of the retrieve call, a new local object of type `PoType` is
        //   created, and returned by the `Promise`. The object, and its owned objects,
        //   are added to the cache, recursively, with `referer` as referer for the main
        //   object, and the owner object as referer for the owned objects.
        //
        //   The remote retrieve might fail, with an error, or an `IdNotFoundException`.
        //   If the object was not in the cache, the `Promise` error function is called
        //   with an error or the `IdNotFoundException`.
        //   If the object was in the cache, and we receive an `IdNotFoundException`, it means
        //   the object was deleted from the server persistent storage since the last time we got
        //   an update. Its `persistenceState` is changed to `DETACHED` and its persistence
        //   properties are cleared (which launches events, that can be observed). If we
        //   receive an error, the error counted is increased. When the error counter
        //   reaches the limit, an error is raised for the user. We assume we have a
        //   communication problem.
        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return PoType});
        // TODO type is a Constructor of a PersistentObject
        this._c_pre(function() {return persistenceId;});
        // TODO persistenceId is an integer
        this._c_pre(function() {return referer;});

        var key = cacheKey(declaredClass(PoType), persistenceId);
        var entry = this._cache[key];
        var p = null;
        if (! entry) {
          p = new PoType();
          p._changeAttrValue("peristenceId", persistenceId);
          this.track(p, referer);
        }
        else {
          p = entry.persistentObject;
        }
        var url = this.getUrl(PoType, persistenceId);
        var loadPromise = request(url, {method: "GET", handleAs: "json"});
        var thisDao = this;
        var resultPromise;
        resultPromise = loadPromise.then(
          function(data) {
            console.trace("Load success: " + data);
            thisDao._resetErrorCount();
            p.reload(data);
            return p; // return PersistentObject
          },
          function(error) {
            // communication error or IdNotFoundException
            if (isIdNotFoundException(error)) {
              thisDao._resetErrorCount();
              thisDao._noLongerInServer(entry);
              return new IdNotFoundException(error);
            }
            else {
              thisDao._incrementErrorCount(error, "GET " + url);
              return "ERROR: could not GET " + cacheKey(declaredClass(PoType), persistenceId) + " (" + error + ")";
            }
          }
        );
        resultPromise.persistentObject = p;
        return resultPromise; // return Promise (extended)
      },

      create: function(/*PersistentObject*/ p, /*Any*/ referer) {
        var thisObject = this;
        this._c_pre(function() {return thisObject.isOperational();});
        this._c_pre(function() {return p;});
        this._c_pre(function() {return p.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return p.get("persistenceId") === null;});

        var PoType = Object.getPrototypeOf(p).constructor;
        var url = this.getUrl(PoType);
        var loadPromise = request(url, {method: "POST", handleAs: "json", data: p.toJsonObject()});
        // MUDO Do JSONify ourselfs?
        var thisDao = this;
        var resultPromise = loadPromise.then(
          function(data) {
            console.trace("Create success: " + data);
            thisDao._resetErrorCount();
            p.reload(data);
            thisDao.track(p, referer);
            return p;
          },
          function(error) {
            // communication error or IdNotFoundException
            if (isSemanticException(error)) {
              return createSemanticException(error);
            }
            else {
              thisDao._incrementErrorCount(error, "POST " + url + " (" + p.toString() + ")");
              return "ERROR: could not POST " + p.toString() + " (" + error + ")";
            }
          }
        );
        resultPromise.persistentObject = p;
        return resultPromise;
      },

      update: function(/*PersistentObject*/ p) {
        var thisObject = this;
        this._c_pre(function() {return thisObject.isOperational();});
        this._c_pre(function() {return p;});
        this._c_pre(function() {return p.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return p.get("persistenceId") !== null});
        // TODO p is in cache

        var PoType = Object.getPrototypeOf(p).constructor;
        var url = this.getUrl(PoType, p.get("persistenceId"));
        var loadPromise = request(url, {method: "PUT", handleAs: "json", data: p.toJsonObject()});
        // MUDO Do JSONify ourselfs?
        var thisDao = this;
        var resultPromise = loadPromise.then(
          function(data) {
            console.trace("Update success: " + data);
            thisDao._resetErrorCount();
            p.reload(data);
            return p;
          },
          function(error) {
            if (isIdNotFoundException(error)) {
              thisDao._resetErrorCount();
              var entry = thisDao._getExistingCacheEntry(p);
              thisDao._noLongerInServer(entry);
              return createSemanticException(error);
            }
            else if (isSemanticException(error)) {
              thisDao._resetErrorCount();
              return createSemanticException(error);
            }
            else {
              thisDao._incrementErrorCount(error, "PUT " + url + " (" + p.toString() + ")");
              return "ERROR: could not PUT " + p.toString() + " (" + error + ")";
            }
          }
        );
        resultPromise.persistentObject = p;
        return resultPromise;
      },

      delete: function(/*PersistentObject*/ p) {
        // DOES NOT REMOVE REFERER!
        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return p;});
        this._c_pre(function() {return p.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return p.get("persistenceId") !== null});
        // TODO p is in cache

        var entry = this._getExistingCacheEntry(p);
        var PoType = Object.getPrototypeOf(p).constructor;
        var url = this.getUrl(PoType, p.get("persistenceId"));
        var loadPromise = request(url, {method: "DELETE", handleAs: "json"});
        var thisDao = this;
        var resultPromise = loadPromise.then(
          function(data) {
            console.trace("Delete success: " + data);
            thisDao._resetErrorCount();
            thisDao._noLongerInServer(entry);
            return p;
          },
          function(error) {
            if (isSemanticException(error)) {
              return createSemanticException(error);
            }
            else {
              thisDao._incrementErrorCount(error, "DELETE " + url + " (" + p.toString() + ")");
              return "ERROR: could not DELETE " + p.toString() + " (" + error + ")";
            }
          }
        );
        resultPromise.persistentObject = p;
        return resultPromise;
      }

    });

    return CrudDao; // return Function
  }
);
