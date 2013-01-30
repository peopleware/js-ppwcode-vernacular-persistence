define(["dojo/_base/declare",
        "../PersistentObject", "../IdNotFoundException", "../CrudDao",
        "dojo/Deferred"],
  function(declare, PersistentObject, IdNotFoundException, CrudDao, Deferred) {

    function cacheKey(/*String*/ type, /*Number*/ persistenceId) {
      // summary:
      //   Returns a key.
      // description:
      //   Returns `type + "@" + persistenceId`

      return type + "@" + persistenceId;
    }

    function declaredClass(/*Function*/ c) {
      var proto = c.prototype;
      return proto.declaredClass;
    }

    var CrudDaoMock = declare([CrudDao], {
      // summary:
      //   This is a mock of CrudDao. We inherit from CrudDao, and overwrite meaningful methods.
      //   All methods are supported. They're behavior can be changed for a number of cases, with
      //   extra properties on parameters that are already there.
      //   Private. Contains a CacheEntry for each retrieved object, that is not yet released.

      get: function(/*Function*/ PoType, /*Number*/ persistenceId, /*Any*/ referer) {
        // description:
        //   referer.error will result in that error
        //   referer.idNotFoundException will result in that exception
        //   referer.resultJson will be the result
        //   referer.waitMillis is the time the promise will take

        var key = cacheKey(declaredClass(PoType), persistenceId);
        var entry = this._cache[key];
        var p = null;
        if (! entry) {
          p = new PoType(referer.resultJson);
          p._changeAttrValue("persistenceId", persistenceId);
        }
        else {
          p = entry.persistentObject;
        }
        this.track(p, referer);
        var thisDao = this;
        var resultDeferred = new Deferred();
        var action;
        if (referer.error) {
          action = function() {
            var PoType = Object.getPrototypeOf(p).constructor;
            var url = thisDao.getUrl(PoType, persistenceId);
            thisDao._incrementErrorCount(referer.error, "GET " + url);
            resultDeferred.reject("ERROR: could not GET " + persistenceId + " (" + referer.error + ")");
          };
        }
        else if (referer.idNotFoundException) {
          action = function() {
            thisDao._resetErrorCount();
            thisDao._noLongerInServer(entry);
            resultDeferred.reject(referer.idNotFoundException);
          };
        }
        else {
          action = function() {
            thisDao._resetErrorCount();
            p.reload(referer.resultJson);
            resultDeferred.resolve(p);
          };
        }
        if ((referer.error && referer.idNotFoundException) && ! referer.waitMillis) {
          action();
        }
        else {
          setTimeout(action, referer.waitMillis);
        }
        var result = {
          promise: resultDeferred.promise,
          persistentObject: p
        };
        return result;
      },

      create: function(/*PersistentObject*/ p, /*Any*/ referer) {
        var thisDao = this;
        var resultDeferred = new Deferred();
        var action;
        if (p.error) {
          action = function() {
            var PoType = Object.getPrototypeOf(p).constructor;
            var url = thisDao.getUrl(PoType);
            thisDao._incrementErrorCount(p.error, "POST " + url + " (" + p.toString() + ")");
            resultDeferred.reject("ERROR: could not POST " + p.toString() + " (" + p.error + ")");
          };
        }
        else if (p.semanticException) {
          action = function() {
            thisDao._resetErrorCount();
            resultDeferred.reject(p.semanticException);
          };
        }
        else {
          action = function() {
            console.log("Simulated positive outcome of remote create - " + p.toString());
            thisDao._resetErrorCount();
            var json = p.toJsonObject();
            json.persistenceId = Math.floor(Math.random() * 1000000000);
            json.persistenceVersion = 1;
            p.reload(json);
            thisDao.track(p, referer);
            resultDeferred.resolve(p);
          };
        }
        if(p.waitMillis) { // TODO: we will alway have a delay
          setTimeout(action, p.waitMillis);
        }
        else {
          action();
        }
        var result = {
          promise: resultDeferred.promise,
          persistentObject: p
        };
        return result;
      },

      update: function(/*PersistentObject*/ p) {
        var thisDao = this;
        var resultDeferred = new Deferred();
        var action;
        if (p.error) {
          action = function() {
            var PoType = Object.getPrototypeOf(p).constructor;
            var url = thisDao.getUrl(PoType, p.get("persistenceId"));
            thisDao._incrementErrorCount(p.error, "PUT " + url + " (" + p.toString() + ")");
            resultDeferred.reject("ERROR: could not PUT " + p.toString() + " (" + p.error + ")");
          };
        }
        else if (p.semanticException) {
          action = function() {
            thisDao._resetErrorCount();
            if (p.semanticException.isInstanceOf && p.semanticException.isInstanceOf(IdNotFoundException)) {
              var entry = thisDao._getExistingCacheEntry(p);
              thisDao._noLongerInServer(entry);
            }
            resultDeferred.reject(p.semanticException);
          };
        }
        else {
          action = function() {
            thisDao._resetErrorCount();
            var previousVersion = p.get("persistenceVersion");
            var json = p.toJsonObject();
            json.persistenceVersion = previousVersion + 1;
            p.reload(json);
            resultDeferred.resolve(p);
          };
        }
        if(p.waitMillis) { // TODO: we will alway have a delay
          setTimeout(action, p.waitMillis);
        }
        else {
          action();
        }
        var result = {
          promise: resultDeferred.promise,
          persistentObject: p
        };
        return result;
      },

      delete: function(/*PersistentObject*/ p) {
        var thisDao = this;
        var resultDeferred = new Deferred();
        // TODO: we will alway have a delay
        if (p.error) {
          setTimeout(function() {
              var PoType = Object.getPrototypeOf(p).constructor;
              var url = thisDao.getUrl(PoType, p.get("persistenceId"));
              thisDao._incrementErrorCount(p.error, "DELETE " + url + " (" + p.toString() + ")");
              resultDeferred.reject("ERROR: could not DELETE " + p.toString() + " (" + p.error + ")");
            },
            p.waitMillis);
        }
        else if (p.semanticException) {
          setTimeout(function() {
              thisDao._resetErrorCount();
              resultDeferred.reject(p.semanticException);
            },
            p.waitMillis);
        }
        else {
          setTimeout(function() {
              thisDao._resetErrorCount();
              var entry = thisDao._getExistingCacheEntry(p);
              thisDao._noLongerInServer(entry);
              var json = p.toJsonObject();
              json.persistenceVersion = null;
              p.reload(json);
              resultDeferred.resolve(p);
            },
            p.waitMillis);
        }
        var result = {
          promise: resultDeferred.promise,
          persistentObject: p
        };
        return result;
      }

    });

    return CrudDaoMock; // return Function
  }
);
