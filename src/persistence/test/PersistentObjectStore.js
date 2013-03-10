define(["dojo/main", "ppwcode/contracts/doh",
        "../PersistentObjectStore"],
  function(dojo, doh,
           PersistentObjectStore) {

    doh.register("PersistentObjectStore", [

      function testConstructor() {
        var subject = new PersistentObjectStore();
        doh.invars(subject);
      }

    ]);

  }
);
