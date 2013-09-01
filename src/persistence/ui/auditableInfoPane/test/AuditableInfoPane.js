define(["ppwcode.util.contracts/doh", "require"],
  function(doh, require) {

    doh.register("test AuditableInfoPane",
                 require.toUrl("./AuditableInfoPane.html"), 999999);

  }
);
