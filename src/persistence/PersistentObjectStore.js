define(["dojo/_base/declare", "ppwcode/collections/StoreOfStateful",
        "./PersistentObject",
        "dojo/_base/lang"],
  function(declare, StoreOfStateful,
           PersistentObject,
           lang) {

    var PersistentObjectStore = declare([StoreOfStateful], {
      // summary:
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
      if (! (Constructor.prototype.persistenceType)) {
        throw new Error("precondition violation: Constructor.prototype.persistenceType");
      }
      if (! (id)) {
        throw new Error("precondition violation: id");
      }
      if (! (toManyPropertyName && lang.isString(toManyPropertyName))) {
        throw new Error("precondition violation: toManyPropertyName && lang.isString(toManyPropertyName)");
      }

      var result = PersistentObject.keyForId(Constructor.prototype.persistenceType, id) + "/" + toManyPropertyName;
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
