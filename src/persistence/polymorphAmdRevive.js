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

define(["ppwcode/oddsAndEnds/typeOf", "dojo/promise/all", "./PersistentObject",
        "./CrudDao", "./LazyToManyDefinition", "./LazyToManyStore",
        "dojo/Deferred", "require"],
  function(typeOf, all, PersistentObject,
           CrudDao, LazyToManyDefinition, LazyToManyStore,
           Deferred, require) {

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
      //   String --> Promise<Constructor>
      //   Will be called with the value of type-properties of objects in the value-graph,
      //   and is expected to return a Promise for the Constructor of the class in JavaScript
      //   that matches the server type defined by the given type-property. The Constructor
      //   must be for a subtype of PersistentObject.
      //   For this, most often an AMD module should be loaded, transforming the type-property
      //   in a MID. We suggest to use Convention over Configuration here, to have an easy conversion,
      //   but in general, this may be a dictionary lookup.
      // crudDao: CrudDao
      //   When an object with a "$type"-property is encountered in
      //   the graph of which `graphRoot` is the root, we first check if an object
      //   with that `persistenceType` and `persistenceId` exists in the cache of `crudDao`.
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
      //   Objects are tested for the presence of a "$type"-property and a meaningful
      //   persistenceId.
      //
      //   Objects that have no such property or persistenceId are treated much like
      //   arrays and arguments.
      //   A Promise is returned that resolves when all the property-values of the original
      //   object are revived, recursively. The Promise resolves to a new object
      //   containing the revived elements. The original referer is passed in the
      //   recursive calls.
      //
      //   Objects that do have a "$type"-property and non-null persistenceId are treated
      //   specially.
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
      //   we will try to create an object of the given type. This is the reason this reviver
      //   returns Promises.
      //   The value of the "$type"-property is offered to `serverType2Constructor`, which should
      //   return the Constructor of a subclass of PersistentObject. This returns a Promise, because
      //   it will probably need to load an AMD module using the "$type"-property value as the basis
      //   for a MID. An object is created with
      //   this constructor, without arguments. This object will be reloaded with a new object
      //   that contains the result of a recursive revive of all the property values of the
      //   original object, where the found object is used as referer. Once reloaded, the new
      //   object is added to the cache of `crudDao`with the original referer as referer. We
      //   return a Promise that resolves to the new object once it is reloaded. Before we go
      //   deep, reviving the property values, we add this Promise to the private revive-cache.
      //   Also, before the Promise resolves, for all properties that have a value
      //   of type `LazyToManyDefinition` in the new object (which is probably defined in the
      //   new object's prototype), a new instance of `LazyToManyStore` is created,
      //   given the definition and the new object, and set as value of that property.

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

      function processArrayLike(/*Array|Arguments*/ ar, /*Object*/ referer) {
        var elementsOrPromises = [];
        // don't use map, because arguments doesn't support it
        for (var i = 0; i < ar.length; i++) {
          elementsOrPromises[i] =  reviveBackTrack(ar[i], referer);
        }
        return all(elementsOrPromises); // all does when internally, and puts all results in an array
      }

      function processObject(/*Object*/ jsonObject, /*Object*/ referer) {
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

        var propertyValuesOrPromises = Object.keys(jsonObject).reduce(
          function (acc, pName) {
            acc[pName] = reviveBackTrack(jsonObject[pName], referer);
            return acc;
          },
          {} // a fresh intermediate object
        );
        return all(propertyValuesOrPromises);  // all does when internally, and puts all results in an object
      }

      function reloadTypedObject(jsonPo, po, referer, deferred) {
        // summary:
        //   Resolves `deferred` with `po`, reloaded with jsonPo,
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
        //   This object, if given, will track `po` in `crudDao` when
        //   `deferred` is resolved.
        // deferred: Deferred
        //   After successful reload, resolve this deferred.
        //   Reject it if anything goes wrong.

        var intermediateObjectPromise = processObject(jsonPo, po); // po is referer going deep
        var reloadPromise = intermediateObjectPromise.then(
          function (intermediateObject) {
            try {
              po.reload(intermediateObject);
              if (referer) {
                crudDao.track(po, referer);
              }
              deferred.resolve(po);
            }
            catch (err) {
              deferred.reject(e);
            }
          },
          function (e) {
            deferred.reject(e);
          }
        );
      }

      function instantiateLazyToMany(/*PersistentObject*/ po) {
        Object.keys(po).forEach(function(propertyName) {
          var candidateDefinition = po[propertyName];
          if (candidateDefinition && candidateDefinition.isInstanceOf && candidateDefinition.isInstanceOf(LazyToManyDefinition)) {
            // probably found in the prototype
            po[propertyName] = new LazyToManyStore(po, candidateDefinition, crudDao);
          }
        });
        // The LazyToMany will be used as referer for all objects it currently
        // contains. When, on stopTracking, a po has no more referers, and is
        // removed from the cache, and as a referer from all other entries,
        // also its LazyToManies will be removed as referer from all other
        // entries.
      }

      function extraOnRemove(/*PersistentObject*/ po, /*CrudDao*/ crudDao) {
        Object.keys(po).forEach(function(poPropName) {
          var propValue = entry.payload[poPropName];
          if (propValue && propValue.isInstanceOf && propValue.isInstanceOf(LazyToManyStore)) {
            crudDao._cache._removeReferer(propertyName, propValue);
          }
        });
      }

      function createTypedObject(/*Object*/ jsonPo, /*Object*/ referer, /*Deferred*/ deferred) {
        // summary:
        //   `deferred` is resolved with a new object of a type defined by jsonPo["$type"], reloaded
        //   with a revived version of jsonPo.
        //   The new object is also used as referer when reviving `jsonPo` property values
        //   recursively.
        // jsonPo: Object
        //   A low level, native object. All its properties must be
        //   primitives, other jsonPos, recursively, or Arrays with
        //   primitive or jsonPo elements, recursively.
        //   Must conform to the rules of json objects to reload PersistentObjects in general,
        //   and of type jsonPo["$type"] in particular.
        // referer: Object
        //   This object, if given, will track the new object in `crudDao`
        //   when the `deferred` is resolved.

        // for the $type, we don't want to wait for the promises on the intermediateObject
        // we can use the original value: strings are not revived in any special way
        var poConstructorPromise = serverType2Constructor(jsonPo["$type"]);
        // we can't process jsonPo in parallel, because we need a po as referer for deep revival beforehand
        poConstructorPromise.then(function(/*Function*/ Constructor) {
            var freshPo = new Constructor();
            instantiateLazyToMany(freshPo);
            reloadTypedObject(jsonPo, freshPo, referer, deferred);
          }
        );
      }

      function processTypedObject(jsonPo, referer) {
        // summary:
        //   Returns the Promise of a PersistentObject, of the type described in
        //   `jsonPo["$type"]`, reloaded with `jsonPo`.
        //   It is either an object from the `crudDao` cache, or a new one.
        //   When the Promise resolves, referer will be tracking the resolved object.
        // jsonPo: Object
        //   A low level, native object. All its properties must be
        //   primitives, other jsonPos, recursively, or Arrays with
        //   primitive or jsonPo elements, recursively.
        //   Must conform to the rules of json objects to reload PersistentObjects in general,
        //   and of type jsonPo["$type"] in particular.
        //   jsonPo.persistenceId cannot be null or undefined.
        // referer: Object
        //   This object, if given, will track the resulting object in `crudDao`
        //   when the Promise resolves.

        var type = jsonPo["$type"];
        var id = jsonPo.persistenceId;
        var key = PersistentObject.keyForId(type, id);
        var cachedPromise = promiseCache[key];

        // reviving this semantic instance already; we piggyback
        // on the existing revive
        if (cachedPromise) {
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
        //   createTypedObject needs a deferred anyway, to deal with the require/promise impedance
        //   mismatch.
        var deferred = new Deferred();
        promiseCache[key] = deferred.promise;
        var cachedPo = crudDao.getCachedByTypeAndId(type, id);
        if (cachedPo) {
          reloadTypedObject(jsonPo, cachedPo, referer, deferred);
        }
        else { // we need a new object
          createTypedObject(jsonPo, referer, deferred);
        }
        return deferred.promise;
      }

      function reviveBackTrack(/*Object*/ value, /*Object*/ referer) {
        // decription:
        //    inner method in revive, because all calls of this method
        //    inside one revive call need to share the cache

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
          return processArrayLike(value, referer);
        }
        if (valueType === "object") {
          if (! (value.hasOwnProperty("$type") && value.persistenceId)) {
            return processObject(value, referer);
          }
          else {
            return processTypedObject(value, referer);
          }
        }
        // default
        throw "ERROR: impossible type (type of '" + value + "' cannot be " + valueType + ")";
        // TODO WHAT ABOUT PROPERTIES OF TYPE CONSTRUCTOR?
      }

      // the real method
      var topResultOrPromise = reviveBackTrack(graphRoot, referer);
      return topResultOrPromise; // return /*Object|Promise*/

    }

    return revive;

  }
);
