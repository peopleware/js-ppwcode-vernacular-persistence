define(["dojo/_base/declare",
        "../PersistentObject", "../IdNotFoundException", "../CrudDao",
        "dojo/Deferred"],
  function(declare, PersistentObject, IdNotFoundException, CrudDao, Defered) {

    function cacheKey(/*String*/ type, /*Number*/ persistenceId) {
      // summary:
      //   Returns a key.
      // description:
      //   Returns `type + "@" + persistenceId`

      return type + "@" + persistenceId;
    }

    function declaredClass(/*Function*/ constructor) {
      return Object.getPrototypeOf(constructor).declaredClass;
    }

    var CrudDaoMock = declare([CrudDao], {
      // summary:
      //   This is a mock of CrudDao. We inherit from CrudDao, and overwrite meaningful methods.
      //   All methods are supported. They're behavior can be changed for a number of cases, with
      //   extra properties on parameters that are already there.
      //   Private. Contains a CacheEntry for each retrieved object, that is not yet released.

      get: function(/*Function*/ PoType, /*Number*/ persistenceId, /*Any*/ referer) {
        var key = cacheKey(declaredClass(PoType), persistenceId);
        var entry = this._cache[key];
        var p = null;
        var inCache;
        if (! entry) {
          inCache = false;
          p = new PoType();
          p._changeAttrValue("peristenceId", persistenceId);
          this.track(p, referer);
        }
        else {
          inCache = true;
          p = entry.persistentObject;
        }
        var thisDao = this;
        var result = new Defered();
        if (persistenceId.error) {
          setTimeout(function() {
              var PoType = Object.getPrototypeOf(p).constructor;
              var url = this.getUrl(PoType, persistenceId);
              thisDao._incrementErrorCount(persistenceId.error, "GET " + url);
              result.reject("ERROR: could not GET " + persistenceId + " (" + persistenceId.error + ")");
            },
            p.waitMillis);
        }
        else if (persistenceId.idNotFoundException) {
          setTimeout(function() {
              thisDao._resetErrorCount();
              thisDao.noLongerInServer(entry);
              result.reject(persistenceId.idNotFoundException);
            },
            persistenceId.waitMillis);
        }
        else {
          if (inCache) {
            thisDao._resetErrorCount();
            p.reload(persistenceId.resultObject);
            result.resolve(p);
          }
          else {
            setTimeout(function() {
              thisDao._resetErrorCount();
              p.reload(persistenceId.resultObject);
              result.resolve(p);
            },
            p.waitMillis);
          }
        }
        result.promise.peristentObject = p;
        return result.promise;
      },

      create: function(/*PersistentObject*/ p, /*Any*/ referer) {
        var thisDao = this;
        var result = new Defered();
        if (p.error) {
          setTimeout(function() {
              var PoType = Object.getPrototypeOf(p).constructor;
              var url = thisDao.getUrl(PoType);
              thisDao._incrementErrorCount(p.error, "POST " + url + " (" + p.toString() + ")");
              result.reject("ERROR: could not POST " + p.toString() + " (" + p.error + ")");
            },
            p.waitMillis);
        }
        else if (p.semanticException) {
          setTimeout(function() {
              thisDao._resetErrorCount();
              result.reject(p.semanticException);
            },
            p.waitMillis);
        }
        else {
          setTimeout(function() {
              thisDao._resetErrorCount();
              thisDao.track(p, referer);
              var json = p.toJsonObject();
              json.persistenceVersion = Math.floor(Math.random() * 1000000000);
              p.reload(json);
              result.resolve(p);
            },
            p.waitMillis);
        }
        return result.promise;
      },

      update: function(/*PersistentObject*/ p) {
        var thisDao = this;
        var result = new Defered();
        if (p.error) {
          setTimeout(function() {
            var PoType = Object.getPrototypeOf(p).constructor;
            var url = thisDao.getUrl(PoType, p.get("persistenceId"));
            thisDao._incrementErrorCount(p.error, "PUT " + url + " (" + p.toString() + ")");
            result.reject("ERROR: could not PUT " + p.toString() + " (" + p.error + ")");
          },
          p.waitMillis);
        }
        else if (p.semanticException) {
          setTimeout(function() {
            thisDao._resetErrorCount();
            if (p.semanticException.isInstanceOf(IdNotFoundException)) {
              var entry = thisDao._getCacheEntry(p);
              thisDao.noLongerInServer(entry);
            }
            result.reject(p.semanticException);
          },
          p.waitMillis);
        }
        else {
          setTimeout(function() {
            thisDao._resetErrorCount();
            var previousVersion = p.get("persistenceVersion");
            var json = p.toJsonObject();
            json.persistenceVersion = previousVersion + 1;
            p.reload(json);
            result.resolve(p);
          },
          p.waitMillis);
        }
        return result.promise;
      },

      delete: function(/*PersistentObject*/ p) {
        var thisDao = this;
        var result = new Defered();
        if (p.error) {
          setTimeout(function() {
              var PoType = Object.getPrototypeOf(p).constructor;
              var url = thisDao.getUrl(PoType, p.get("persistenceId"));
              thisDao._incrementErrorCount(p.error, "DELETE " + url + " (" + p.toString() + ")");
              result.reject("ERROR: could not DELETE " + p.toString() + " (" + p.error + ")");
            },
            p.waitMillis);
        }
        else if (p.semanticException) {
          setTimeout(function() {
              thisDao._resetErrorCount();
              result.reject(p.semanticException);
            },
            p.waitMillis);
        }
        else {
          setTimeout(function() {
              thisDao._resetErrorCount();
              var entry = thisDao._getCacheEntry(p);
              thisDao.noLongerInServer(entry);
              var json = p.toJsonObject();
              json.persistenceVersion = null;
              p.reload(json);
              result.resolve(p);
            },
            p.waitMillis);
        }
        return result.promise;
      }

    });

    return CrudDaoMock; // return Function
  }
);
