define(["dojo/main", "ppwcode/contracts/doh", "require"],
  function(dojo, doh, require) {

    doh.register("test _PersistentObjectEditPane Person",
      require.toUrl("./_PersistentObjectEditPane_Person.html"), 999999);
    doh.register("test _PersistentObjectEditPane SpecialPerson",
      require.toUrl("./_PersistentObjectEditPane_SpecialPerson.html"), 999999);

  }
);
