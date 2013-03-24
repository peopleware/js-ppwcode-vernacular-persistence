define(["dojo/main", "ppwcode/contracts/doh",
        "../UrlBuilder"],
  function(dojo, doh,
           UrlBuilder) {

    doh.register("ppwcode vernacular persistence UrlBuilder", [

      function testConstructor() {
        var subject = new UrlBuilder();
        doh.invars(subject);
      }

      // can't test anything else; this is an interface

    ]);

  }
);
