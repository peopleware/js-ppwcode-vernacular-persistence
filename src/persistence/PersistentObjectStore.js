define(["dojo/_base/declare", "ppwcode/collections/StoreOfStateful",
        "./PersistentObject"],
  function(declare, StoreOfStateful,
           PersistentObject) {

    var PersistentObjectStore = declare([StoreOfStateful], {

      _c_invar: [
        function() {return this.getIdentity === PersistentObject.keyForObject;}
      ],

      constructor: function() {
        this.getIdentity = PersistentObject.keyForObject
      }

    });

    return PersistentObjectStore;
  }
);
