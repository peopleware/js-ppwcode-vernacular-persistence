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

define(["dojo/_base/declare", "ppwcode-util-collections/StoreOfStateful",
        "./PersistentObject",
        "dojo/_base/lang"],
  function(declare, StoreOfStateful,
           PersistentObject,
           lang) {

    var PersistentObjectStore = declare([StoreOfStateful], {
      // summary:
      //   A Store for PersistentObjects. This extends StoreOfStateful
      //   with a getIdentity function for PersistentObjects.
      //   Instance should be wrapped in dojo/store/Observable

      getIdentity: PersistentObject.keyForObject,

      _c_invar: [
        function() {return this.getIdentity === PersistentObject.keyForObject;}
      ]

    });



    PersistentObjectStore.keyForId = function(/*Function*/ Constructor, /*Number*/ id, /*String*/ toManyPropertyName) {
      // summary:
      //   When PersistentObjectStore is used to express a to-many reference
      //   of a PersistentObject, this returns a unique key for such a store.
      // IDEA can't use current form of precondition here
      if (! (Constructor && lang.isFunction(Constructor))) {
        throw new Error("precondition violation: Constructor && lang.isFunction(Constructor)");
      }
      // IDEA must be a subtype of PeristentObject
      if (! (Constructor.prototype.getTypeDescription) || !(Constructor.prototype.getTypeDescription())) {
        throw new Error("precondition violation: Constructor.prototype.getTypeDescription does not exist");
      }
      if (! (id)) {
        throw new Error("precondition violation: id");
      }
      if (! (toManyPropertyName && lang.isString(toManyPropertyName))) {
        throw new Error("precondition violation: toManyPropertyName && lang.isString(toManyPropertyName)");
      }

      var result = PersistentObject.keyForId(Constructor.prototype.getTypeDescription(), id) + "/" + toManyPropertyName;
      return result; // return String
    };

    PersistentObjectStore.keyForObject = function(/*PersistentObject*/ po, /*String*/ toManyPropertyName) {
      // summary:
      //   When PersistentObjectStore is used to express a to-many reference
      //   of a PersistentObject, this returns a unique key for such a store.
      // IDEA can't use current form of precondition here
      if (! (po && po.get("persistenceId") != null)) {
        throw new Error("precondition violation: po && po.get('persistenceId') != null");
      }
      if (! (toManyPropertyName && lang.isString(toManyPropertyName))) {
        throw new Error("precondition violation: toManyPropertyName && lang.isString(toManyPropertyName)");
      }

      var Constructor = po.constructor;
      return PersistentObjectStore.keyForId(Constructor, po.get("persistenceId"), toManyPropertyName); // return String
    };



    return PersistentObjectStore;
  }
);
