define(["ppwcode.contracts/doh", "require"],
  function(doh, require) {

    // TODO there are no such tests
    doh.register("test _PersistentObjectEditPane Person",
      require.toUrl("./_PersistentObjectEditPane_Person.html"), 999999);
    doh.register("test _PersistentObjectEditPane SpecialPerson",
      require.toUrl("./_PersistentObjectEditPane_SpecialPerson.html"), 999999);

  }
);
