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

define(["ppwcode-util-oddsAndEnds/typeOf", "dojo/promise/all",
        "./PersistentObject", "ppwcode-vernacular-semantics/SemanticObject", "ppwcode-vernacular-semantics/EnumerationValue",
        "dojo/Deferred", "dojo/when", "ppwcode-util-oddsAndEnds/promise/relent", "ppwcode-util-oddsAndEnds/log/logger!"],
  function(typeOf, all,
           PersistentObject, SemanticObject, EnumerationValue,
           Deferred, when, relent, logger) {

    function revive(/*Object*/   graphRoot,
                    /*Object*/   referer,
                    /*Function*/ serverType2Constructor,
                    /*CrudDao*/  crudDao) {
      // summary:
      //   Returns the Promise of a result, or a result, transforming
      //   graphRoot, deep, depth-first, to a graph of instances of classes
      //   whose type is defined in "$type"-properties in objects
      //   in this graph.
      //   Primitives are just kept what they are. Arrays and objects
      //   are replaced, so that the original structure is unchanged.
      //
      // graphRoot: Object
      //   Anything, root of the graph to revive. Intended to be the naked object
      //   graph, after JSON.parse of a JSON structure, but can deal with more.
      //   This should be a tree (no cross-references, no loops).
      // referer: Object
      //   The first referer when adding resulting objects to the cache of `crudDao`.
      // serverType2Constructor: Function
      //   String --> Promise<Constructor> | Constructor
      //   Will be called with the value of type-properties of objects in the value-graph,
      //   and is expected to return a Promise for the Constructor or the Constructor of the class
      //   in JavaScript that matches the server type defined by the given type-property.
      //   For this, most often an AMD module should be loaded, transforming the type-property
      //   in a MID. We suggest to use Convention over Configuration here, to have an easy conversion,
      //   but in general, this may be a dictionary lookup.
      //   It is an error for this function to throw an exception. This indicates, e.g.,
      //   that the String value is at fault, or the function cannot deal with the String value.
      //   The function may return null or undefined. In this case, the object for which
      //   type property the call was made, is handled as an untyped object.
      // crudDao: CrudDao
      //   When an object with a "$type"-property is encountered in
      //   the graph of which `graphRoot` is the root, and serverType2Constructor returns a type
      //   that is a subtype of PersistentObject, we first check if an object
      //   with that `typeDescription` and `persistenceId` exists in the cache of `crudDao`.
      //   If it does, it is reloaded with the revival of the properties of the graph-object.
      //   If such an object does not exist in the cache, a new object is created with the
      //   Constructor returned by `serverType2Constructor` given the type defined in the object,
      //   and this new object is added to the cache of `crudDao` with a referer.
      //   The referer is the given `referer` for the first levels of the graph, but
      //   the found or created PersistentObjects for the revival of their properties.
      //
      // description:
      //   undefined, null, Errors, regular expressions, numbers, strings and booleans
      //   are immediately returned.
      //   Also Math and JSON (system objects) are returned as is.
      //   If graphRoot is a Date, a copy is created and returned.
      //
      //   For arrays and arguments a Promise is returned that resolves when all
      //   its elements are revived, recursively. The Promise resolves to a new array
      //   containing the revived elements. The original referer is passed in the
      //   recursive calls.
      //
      //   Objects are tested for the presence of a "$type"-property.
      //
      //   Objects that have no such property are treated much like arrays and arguments.
      //   A Promise is returned that resolves when all the property-values of the original
      //   object are revived, recursively. The Promise resolves to a new object
      //   containing the revived elements. The original referer is passed in the
      //   recursive calls.
      //
      //   Objects that do have a "$type"-property are treated specially.
      //   The value of the "$type"-property is offered to `serverType2Constructor`.
      //   `serverType2Constructor` and this function return Promises, just because
      //   `serverType2Constructor` will probably need to load an AMD module using the "$type"-property
      //   value as the basis for a MID.
      //
      //   If null or undefined is returned, the object is handled as an untyped object.
      //
      //   If the returned Constructor is for a subtype of PersistentObject, the graph-object
      //   must have a property `persistenceId` with a meaningful value.
      //
      //   First, we look in a private revive-cache for an entry with key
      //   PersistentObject.keyForId(), with the value of the "$type"-property,
      //   and the value of the "persistenceId"-property as arguments. This entry is a
      //   Promise. If we find one, we return that Promise (it makes no sense to reload
      //   the same object with the same business identity more than once: only the data
      //   of the first encountered occurrence of a object with a given business key in the
      //   given graph is used).
      //
      //   If we do not find such a Promise, we ask the cache of `crudDao` for an entry with the
      //   business key. If such an object is found, it will be reloaded with a new object
      //   that contains the result of a recursive revive of all the property values of the
      //   original object, where the found object is used as referer. The original referer is
      //   added as a referer for the found object in the cache. We return a Promise
      //   that resolves to the found object once it is reloaded. Before we go deep, reviving
      //   the property values, we add this Promise to the private revive-cache.
      //   Note that this successfully deals with different objects with the same key
      //   that appear in the graph, and thus when the same object would occur in the
      //   graph more than once. This does not however deal with loops in the graph
      //   with arrays, or objects that have no peristenceId.
      //
      //   If no entry is found in the cache of `crudDao` for objects with a "$type"-property
      //   and a non-null persistenceId for which there is no Promise in the private revive-cache,
      //   we will try to create an object of the given type with the Constructor returned by
      //   `serverType2Constructor`, without arguments. This object will be reloaded with a new object
      //   that contains the result of a recursive revive of all the property values of the
      //   original object, where the new object is used as referer. Once reloaded, the new
      //   object is added to the cache of `crudDao` with the original referer as referer. We
      //   return a Promise that resolves to the new object once it is reloaded. Before we go
      //   deep, reviving the property values, we add this Promise to the private revive-cache.
      //
      //   If the Constructor returned by `serverType2Constructor` is not a subtype of
      //   PersistentObject, a new Object is created with this constructor, with as argument a new
      //   object that contains the result of a recursive revive of all the property values of the
      //   original object, where the found object is used as referer.

      var promiseCache = {};
      // we only cache promises for PersistentObjects
      // this is the reason for the call of reviveBackTrack method inside revive: this is shared
      // between all calls of reviveBackTrack inside one call of revive

      function canUseAsIs(valueType) {
        return valueType === "string" ||
          valueType === "boolean" ||
          valueType === "number" ||
          valueType === "json" ||
          valueType === "math" ||
          valueType === "regexp" ||
          valueType === "error";
      }

      function isSubtypeOf(SuperConstructor, Constructor) {
        return Constructor.prototype.isInstanceOf && Constructor.prototype.isInstanceOf(SuperConstructor);
      }

      function processArrayLike(/*Array|Arguments*/ ar, /*Object*/ referer, debugPrefix) {
        logger.debug(debugPrefix + "processing array (length: " + ar.length + ") [", ar);
        var elementsOrPromises = [];
        // don't use map, because arguments doesn't support it
        for (var i = 0; i < ar.length; i++) {
          logger.debug(debugPrefix + "  processing array element: " + ar[i] + " (going deep)");
          elementsOrPromises[i] =  (function() { // lock ar[i] in scope
            var element = ar[i];
            return relent(function() {return reviveBackTrack(element, referer, debugPrefix + "    ");});
          })();
        }
        return all(elementsOrPromises); // all does when internally, and puts all results in an array
      }

      function processObject(/*Object*/ jsonObject, /*Object*/ referer, debugPrefix) {
        // summary:
        //   Returns the promise of a new object with revived versions
        //   of all own enumerable properties of jsonPo, recursively.
        // jsonObject: Object
        //   A low level, native object. All its properties must be
        //   primitives, other jsonObjects, recursively, or Arrays with
        //   primitive or jsonObject elements, recursively.
        // referer: Object
        //   This object, if given, is used as referer in reviving the
        //   the properties of jsonObject.

        logger.debug(debugPrefix + "processing " + jsonObject + " (going deep)");
        var propertyValuesOrPromises = Object.keys(jsonObject).reduce(
          function (acc, pName) {
            logger.debug(debugPrefix + "  processing object property: " +
              pName + ": " + jsonObject[pName] + " (going deep)");
            acc[pName] = reviveBackTrack(jsonObject[pName], referer, debugPrefix + "    ");
            return acc;
          },
          {} // a fresh intermediate object
        );
        return all(propertyValuesOrPromises);  // all does when internally, and puts all results in an object
      }

      function reloadPersistentObject(jsonPo, po, referer, debugPrefix) {
        // summary:
        //   Returns Promise that resolves with po, reloaded with jsonPo,
        //   and tracked in `crudDao` by `referer`.
        // jsonPo: Object
        //   A low level, native object. All its properties must be
        //   primitives, other jsonPos, recursively, or Arrays with
        //   primitive or jsonPo elements, recursively.
        //   Must conform to the rules of json objects to reload PersistentObjects in general,
        //   and of po in particular.
        // po: PersistentObject
        //   The PersistentObject in which to reload the data.
        //   Also used as referer when reviving `jsonPo` property values
        //   recursively.
        // referer: Object
        //   This object, if given, will track `po` in `crudDao` when the Promise
        //   is resolved.

        logger.debug(debugPrefix + "reloading object for " + jsonPo["$type"] + "@" + jsonPo.persistenceId);
        var intermediateObjectPromise = processObject(jsonPo, po, debugPrefix + "  "); // po is referer going deep
        var reloadedPromise = intermediateObjectPromise.then(
          function (intermediateObject) {
            logger.trace(debugPrefix + "intermediate object ready for reloading " + jsonPo["$type"] + "@" + jsonPo.persistenceId);
            po.reload(intermediateObject);
            logger.trace(debugPrefix + "reloaded: " + po.toString());
            if (referer) {
              logger.trace(debugPrefix + "tracking: " + po.toString() + " by " + referer);
              crudDao.track(po, referer);
            }
            logger.debug(debugPrefix + "ready: " + po.toString());
            return po;
          }
        );
        return reloadedPromise;
      }

      function processPersistentObject(jsonPo, referer, Constructor, debugPrefix) {
        // summary:
        //   Returns the Promise of an object. It is either an object from the
        //   `crudDao` cache, or a new one , reloaded with `jsonPo`. When the Promise resolves,
        //   referer will be tracking the resolved object.
        // jsonObject: Object
        //   A low level, native object. All its properties must be
        //   primitives, other jsonObjects, recursively, or Arrays with
        //   primitive or jsonObject elements, recursively.
        //   Must conform to the rules of json objects to reload PersistentObjects in general,
        //   and of type jsonObject["$type"] in particular.
        // referer: Object
        //   This object, if given, will track the resulting object in `crudDao`
        //   when the Promise resolves.

        if (!jsonPo.persistenceId) {
          throw "ERROR: found object in graph to revive with type " + jsonPo["$type"] +
            " that resolved to a Constructor that is a subtype of PersistentObject, but contained no " +
            "meaningful persistenceId - " + jsonPo;
        }
        var type = Constructor.prototype.getTypeDescription();
        var id = jsonPo.persistenceId;
        var key = PersistentObject.keyForId(type, id);
        logger.debug(debugPrefix + "asked to revive " + key);
        var cachedPromise = promiseCache[key];

        // reviving this persistent object instance already; we piggyback
        // on the existing revive
        if (cachedPromise) {
          logger.debug(debugPrefix + "already reviving " + key);
          return cachedPromise.then(
            function(po) {
              if (referer) {
                crudDao.track(po, referer);
              }
              return po;
            }
          );
        }

        // not encountered this key yet
        //   We want the promise in the promiseCache before we go deep. Therefor, we
        //   do not store the resulting promise of the deep call, but create a deferred first.
        var deferred = new Deferred();
        promiseCache[key] = deferred.promise;
        var /*PersistentObject*/ reloadTarget = crudDao.getCachedByTypeAndId(type, id);
        if (reloadTarget) {
          logger.debug(debugPrefix + "found in cache: " + key);
        }
        else {
          logger.info(debugPrefix + "not found in cache; creating new object for: " + key);
          //noinspection JSValidateTypes
          reloadTarget = new Constructor();
        }
        var reloadedPromise = reloadPersistentObject(jsonPo, reloadTarget, referer, debugPrefix + "  ");
        reloadedPromise.then(
          function(reloaded) {
            logger.debug(debugPrefix + "revived: " + key);
            deferred.resolve(reloaded);
          },
          function(err) {
            logger.error(debugPrefix + "error reviving: " + key, err);
            deferred.reject(err);
          }
        );
        return deferred.promise;
      }

      function processSemanticNonPersistentObject(jsonObject, referer, Constructor, debugPrefix) {
        // summary:
        //   Returns the Promise of an object constructed with `Constructor` without arguments
        //   and reloaded with the processed `jsonObject` as arguments.
        // jsonObject: Object
        //   A low level, native object. All its properties must be
        //   primitives, other jsonObjects, recursively, or Arrays with
        //   primitive or jsonObject elements, recursively.
        //   Must conform to the rules of the arguments of Constructor.prototype.reload.
        // referer: Object
        //   This object is used as referer for the processing of jsonObject.

        logger.debug(debugPrefix + "processing semantic non-persistent-object " + jsonObject +
          " ($type = " + jsonObject["$type"] + ")");
        var intermediateObjectPromise = processObject(jsonObject, referer, debugPrefix + "  ");
        var objectPromise = intermediateObjectPromise.then(
          function(intermediate) {
            var fresh = new Constructor();
            fresh.reload(intermediate);
            logger.debug(debugPrefix + "created fresh object: " + fresh);
            return fresh;
          }
        );
        return objectPromise;
      }

      function processEnumerationValue(jsonObject, Constructor, debugPrefix) {
        // summary:
        //   Returns an object selected from `Constructor` based on
        //   `jsonObject.representation`.
        // jsonObject: Object
        //   A low level, native object. It must have a String property `representation`.

        logger.debug(debugPrefix + "processing typed enumeration value " + jsonObject +
          " ($type = " + jsonObject["$type"] + ")");
        var result = Constructor.revive(jsonObject.representation);
        if (!result) {
          throw "ERROR: could not revive " + jsonObject + ". No value with representation '" +
            jsonObject.representation + "' in " + (Constructor.mid || Constructor.values());
        }
        return result;
      }

      function processTypedNonSemanticObject(jsonObject, referer, Constructor, debugPrefix) {
        // summary:
        //   Returns the Promise of an object constructed with `Constructor` and the processed
        //   `jsonObject` as arguments.
        // jsonObject: Object
        //   A low level, native object. All its properties must be
        //   primitives, other jsonObjects, recursively, or Arrays with
        //   primitive or jsonObject elements, recursively.
        //   Must conform to the rules of the arguments of a Constructor.
        // referer: Object
        //   This object is used as referer for the processing of jsonObject.

        logger.debug(debugPrefix + "processing typed non-persistent-object " + jsonObject +
          " ($type = " + jsonObject["$type"] + ")");
        var intermediateObjectPromise = processObject(jsonObject, referer, debugPrefix + "  ");
        var objectPromise = intermediateObjectPromise.then(
          function(intermediate) {
            var fresh = new Constructor(intermediate);
            logger.debug(debugPrefix + "created fresh object: " + fresh);
            return fresh;
          }
        );
        return objectPromise;
      }

      function processTypedObject(jsonObject, referer, debugPrefix) {
        // summary:
        //   Returns the Promise of an object. If the type described in
        //   `jsonObject["$type"]` can be matched to a Constructor, it will be an instance of that type.
        //   If the Constructor is a subtype of PersistentObject, it is either an object from the
        //   `crudDao` cache, or a new one , reloaded with `jsonObject`. When the Promise resolves,
        //   referer will be tracking the resolved object.
        //   If the Constructor is not a subtype of PersistentObject, it is a new Object, created
        //   with `jsonObject` as constructor arguments.
        //   If `jsonObject["$type"]` cannot be matched to a Constructor, it is revived as a non-typed
        //   object.
        // jsonObject: Object
        //   A low level, native object. All its properties must be
        //   primitives, other jsonObjects, recursively, or Arrays with
        //   primitive or jsonObject elements, recursively.
        //   Must conform to the rules of json objects to reload PersistentObjects in general,
        //   and of type jsonObject["$type"] in particular, if jsonObject["$type"] can be matched
        //   to a Constructor that is a subtype of PersistentObject. In that case,
        //   jsonObject.persistenceId cannot be null or undefined.
        //   Must conform to the rules of the arguments of a Constructor if jsonObject["$type"]
        //   can be matched to a Constructor that is not a subtype of PersistentObject.
        // referer: Object
        //   This object, if given, will track the resulting object in `crudDao`
        //   when the Promise resolves, if jsonObject["$type"] can be matched
        //   to a Constructor that is a subtype of PersistentObject.

        logger.debug(debugPrefix + "processing typed object " + jsonObject + " ($type: " + jsonObject["$type"] + ")");
        // for the $type, we don't want to wait for the promises on the intermediateObject
        // we can use the original value: strings are not revived in any special way anyway
        var poConstructorPromiseOrConstructor = serverType2Constructor(jsonObject["$type"]);
        var processedPromise = when(poConstructorPromiseOrConstructor).then(
          function(Constructor) {
            if (Constructor && (typeOf(Constructor) !== "function")) {
              throw "ERROR: serverType2Constructor returned something that is not a Function (" +
                Constructor + ") for type " + jsonObject["$type"];
            }
            if (!Constructor) {
              logger.debug(debugPrefix + "serverType2Constructor returned no Constructor for " + jsonObject["$type"]);
              return processObject(jsonObject, referer, debugPrefix + "  ");
            }
            else if (isSubtypeOf(PersistentObject, Constructor) && jsonObject.persistenceId) {
              logger.debug(debugPrefix + "serverType2Constructor returned Constructor, subtype of PersistentObject, for " +
                jsonObject["$type"] + "@" + jsonObject.persistenceId);
              return processPersistentObject(jsonObject, referer, Constructor, debugPrefix);
            }
            else if (isSubtypeOf(SemanticObject, Constructor)) {
              logger.debug(debugPrefix + "serverType2Constructor returned Constructor, subtype of SemanticObject, for " +
                jsonObject["$type"]);
              return processSemanticNonPersistentObject(jsonObject, referer, Constructor, debugPrefix);
            }
            else if (isSubtypeOf(EnumerationValue, Constructor)) {
              logger.debug(debugPrefix + "serverType2Constructor returned Constructor, subtype of EnumerationValue, for " +
                jsonObject["$type"] + "@" + jsonObject.representation);
              return processEnumerationValue(jsonObject, Constructor, debugPrefix);
            }
            else {
              logger.debug(debugPrefix + "serverType2Constructor returned Constructor, not a subtype of SemanticObject, for " +
                jsonObject["$type"]);
              return processTypedNonSemanticObject(jsonObject, referer, Constructor, debugPrefix);
            }
          }
        );
        return processedPromise;
      }

      function reviveBackTrack(value, /*Object*/ referer, debugPrefix) {
        // decription:
        //    inner method in revive, because all calls of this method
        //    inside one revive call need to share the cache

        logger.debug(debugPrefix + "reviving " + value);
        if (!value) {
          // all falsy's can be returned immediately
          return value; // return Object
        }
        var valueType = typeOf(value);
        if (canUseAsIs(valueType)) {
          // no processing required
          return value; // return Object
        }
        if (valueType === "date") {
          return new Date(value.getTime());
        }
        if (valueType === "array" || valueType === "arguments") {
          return processArrayLike(value, referer, debugPrefix + "  ");
        }
        if (valueType === "object") {
          if (!value.hasOwnProperty("$type")) {
            return processObject(value, referer, debugPrefix + "  ");
          }
          else {
            return processTypedObject(value, referer, debugPrefix + "  ");
          }
        }
        // default
        throw "ERROR: impossible type (type of '" + value + "' cannot be " + valueType + ")";
        // TODO WHAT ABOUT PROPERTIES OF TYPE CONSTRUCTOR?
      }

      // the real method
      logger.debug("asked to revive " + graphRoot);
      var topResultOrPromise = reviveBackTrack(graphRoot, referer, "  ");
      return topResultOrPromise; // return /*Object|Promise*/

    }

    return revive;

  }
);
