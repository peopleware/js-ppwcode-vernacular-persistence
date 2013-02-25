define(["dojo/main", "ppwcode/contracts/doh", "require"],
  function(dojo, doh, require) {

    doh.register("test AuditableInfoPane",
                 require.toUrl("./AuditableInfoPane.html"), 999999);

  }
);
