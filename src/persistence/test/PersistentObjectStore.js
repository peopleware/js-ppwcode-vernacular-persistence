define(["dojo/main", "ppwcode/contracts/doh",
        "../PersistentObjectStore", "../PersistentObject", "dojo/store/Observable",
        "dojo/_base/declare", "dojo/_base/lang"],
  function(dojo, doh,
           PersistentObjectStore, PersistentObject, Observable,
           declare, lang) {

    var type = "SOME TYPE DESCRIPTOR";
    var Mock = declare([PersistentObject], {
      persistenceType: type
    });

    doh.register("PersistentObjectStore", [

      function testConstructor() {
        var subject = new PersistentObjectStore();
        doh.invars(subject);
      },

      function testConstructor() {
        var subject = Observable(new PersistentObjectStore());
        doh.invars(subject);
      },

      function testKeyForId() {
        var id = 9859893;
        var toMany = "A TOO MANY NAME";
        var key = PersistentObjectStore.keyForId(Mock, id, toMany);
        doh.t(lang.isString(key));
        doh.is(type + "@" + id + "/" + toMany, key);
      },

      function testKeyForObject() {
        var id = 9859893;
        var subject = new Mock({persistenceId: id});
        var toMany = "A TOO MANY NAME";
        var key = PersistentObjectStore.keyForObject(subject, toMany);
        doh.t(lang.isString(key));
        doh.is(type + "@" + id + "/" + toMany, key);
      }

    ]);

  }
);
