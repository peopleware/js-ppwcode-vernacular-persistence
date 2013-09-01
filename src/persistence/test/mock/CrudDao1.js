/*
 Copyright 2012 - $Date $ by PeopleWare n.v.

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
        "../../CrudDao",
        "../../UrlBuilder",
        "../../VersionedPersistentObject", "../../AuditableObject", "../../IdNotFoundException",
        "./Person", "ppwcode.oddsAndEnds/typeOf",
        "dojo/Deferred", "require"],
  function(declare,
           CrudDao,
           UrlBuilder,
           VersionedPersistentObject, AuditableObject, IdNotFoundException,
           Person, typeOf,
           Deferred, require) {

    function markDeletedFromServer(cache, p) {
      var entry = cache.get(p);
      if (!entry) {
        throw "ERROR: to delete, p must be in cache";
      }
      var json = p.toJSON();
      json.persistenceId = null;
      if (p.isInstanceOf(VersionedPersistentObject)) {
        json.persistenceVersion = null;
      }
      if (p.isInstanceOf(AuditableObject)) {
        json.createdAt = null;
        json.createdBy = null;
        json.lastModifiedAt = null;
        json.lastModifiedBy = null;
      }
      p.reload(json); // should remove from cache
    }

    var UrlBuilderMock = declare([UrlBuilder], {
      toMany: function(serverType, id, serverPropertyName) {
        return require.toUrl("./persons.json");
      }
    });

    var CrudDaoMock = declare([CrudDao], {
      // summary:
      //   This is a mock of CrudDao. We inherit from CrudDao, and overwrite meaningful methods.
      //   All methods are supported. They're behavior can be changed for a number of cases, with
      //   extra properties on parameters that are already there.
      //   Private. Contains a CacheEntry for each retrieved object, that is not yet released.

      constructor: function() {
        this.urlBuilder = new UrlBuilderMock();
        this.revive = function revive(/*Object*/ json, /*Object*/ referer, /*_Cache*/ cache) {
          if (typeOf(json) === "array") {
            return json.map(function(e) {
              return revive(e, referer, cache);
            });
          }
          else {
            var p = new Person();
            p.reload(json);
            return p;
          }
        }
      },

      retrieve: function(/*String*/ serverType, /*Number*/ persistenceId, /*Any*/ referer) {
        // description:
        //   referer.error will result in that error
        //   referer.idNotFoundException will result in that exception
        //   referer.resultJson will be the result, of type referer.PoType
        //   referer.waitMillis is the time the promise will take

        var cachedPo = this._cache.getByTypeAndId(serverType, persistenceId);
        var p = null;
        if (! cachedPo) {
          p = new referer.PoType();
          p.reload(referer.resultJson);
          p._changeAttrValue("persistenceId", persistenceId);
        }
        else {
          p = cachedPo;
        }
        this.track(p, referer);
        var thisDao = this;
        var resultDeferred = new Deferred();
        if (referer.error) {
          setTimeout(
            function() {
              resultDeferred.reject("ERROR: could not GET " + persistenceId + " (" + referer.error + ")");
            },
            referer.waitMillis
          );
        }
        else if (referer.idNotFoundException) {
          setTimeout(
            function() {
              markDeletedFromServer(thisDao._cache, p);
              resultDeferred.reject(referer.idNotFoundException);
            },
            referer.waitMillis
          );
        }
        else {
          setTimeout(
            function() {
              p.reload(referer.resultJson);
              resultDeferred.resolve(p);
            },
            referer.waitMillis
          );
        }
        return resultDeferred.promise;
      },

      create: function(/*PersistentObject*/ p, /*Any*/ referer) {
        // description:
        //   p.error will result in that error
        //   p.semanticException will result in that exception
        //   p.waitMillis is the time the promise will take

        var thisDao = this;
        var resultDeferred = new Deferred();
        if (p.error) {
          setTimeout(
            function() {
              resultDeferred.reject("ERROR: could not POST " + p.toString() + " (" + p.error + ")");
            },
            p.waitMillis
          );
        }
        else if (p.semanticException) {
          setTimeout(
            function() {
              resultDeferred.reject(p.semanticException);
            },
            p.waitMillis
          );
        }
        else {
          setTimeout(
            function() {
              console.log("Simulated positive outcome of remote create - " + p.toString());
              var json = p.toJSON();
              json.persistenceId = Math.floor(Math.random() * 1000000000);
              if (p.isInstanceOf(VersionedPersistentObject)) {
                json.persistenceVersion = 1;
              }
              if (p.isInstanceOf(AuditableObject)) {
                var now = new Date();
                json.createdBy= "De Maker";
                json.createdAt= now;
                json.lastModifiedBy = "De Maker";
                json.lastModifiedAt = now;
              }
              p.reload(json);
              thisDao.track(p, referer);
              resultDeferred.resolve(p);
            },
            p.waitMillis
          );
        }
        return resultDeferred.promise;
      },

      update: function(/*PersistentObject*/ p) {
        // description:
        //   p.error will result in that error
        //   p.semanticException will result in that exception
        //   p.waitMillis is the time the promise will take

        var thisDao = this;
        var resultDeferred = new Deferred();
        if (p.error) {
          setTimeout(
            function() {
              resultDeferred.reject("ERROR: could not PUT " + p.toString() + " (" + p.error + ")");
            },
            p.waitMillis
          );
        }
        else if (p.semanticException) {
          setTimeout(
            function() {
              if (p.semanticException.isInstanceOf && p.semanticException.isInstanceOf(IdNotFoundException)) {
                markDeletedFromServer(thisDao._cache, p);
              }
              resultDeferred.reject(p.semanticException);
            },
            p.waitMillis
          );
        }
        else {
          setTimeout(
            function() {
              var json = p.toJSON();
              if (p.isInstanceOf(VersionedPersistentObject)) {
                json.persistenceVersion = p.get("persistenceVersion") + 1;
              }
              if (p.isInstanceOf(AuditableObject)) {
                json.createdBy = p.get("createdBy");
                json.createdAt = p.get("createdAt");
                json.lastModifiedBy = "André Aanpassing";
                json.lastModifiedAt = new Date();
              }
              p.reload(json);
              resultDeferred.resolve(p);
            },
            p.waitMillis
          );
        }
        return resultDeferred.promise;
      },

      remove: function(/*PersistentObject*/ p) {
        // description:
        //   p.error will result in that error
        //   p.semanticException will result in that exception
        //   p.waitMillis is the time the promise will take

        var thisDao = this;
        var resultDeferred = new Deferred();
        if (p.error) {
          setTimeout(
            function() {
              resultDeferred.reject("ERROR: could not DELETE " + p.toString() + " (" + p.error + ")");
            },
            p.waitMillis
          );
        }
        else if (p.semanticException) {
          setTimeout(
            function() {
              resultDeferred.reject(p.semanticException);
            },
            p.waitMillis
          );
        }
        else {
          setTimeout(
            function() {
              markDeletedFromServer(thisDao._cache, p);
              resultDeferred.resolve(p);
            },
            p.waitMillis
          );
        }
        return resultDeferred.promise;
      }

//      _refresh: function(result, url, query, referer) {
//        // description:
//        //   result.error will result in that error
//        //   result.semanticException will result in that exception
//        //   result.waitMillis is the time the promise will take
//        //   Promise resolves to result.arrayOfResult
//        var resultDeferred = new Deferred();
//        if (result.error) {
//          setTimeout(
//            function() {
//              resultDeferred.reject("ERROR: could not GET all from" + url + " (" + result.error + ")");
//            },
//            result.waitMillis
//          );
//        }
//        else if (result.semanticException) {
//          setTimeout(
//            function() {
//              resultDeferred.reject(result.semanticException);
//            },
//            result.waitMillis
//          );
//        }
//        else {
//          setTimeout(
//            function() {
//              result.loadAll(result.arrayOfResult);
//            },
//            result.waitMillis
//          );
//        }
//        return resultDeferred.promise;
//      }

    });

    return CrudDaoMock; // return Function
  }
);
