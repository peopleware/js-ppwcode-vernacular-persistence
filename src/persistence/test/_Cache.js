define(["dojo/main", "ppwcode/contracts/doh",
        "../_Cache",
        "../PersistentObject", "ppwcode/collections/StoreOfStateful",
        "ppwcode/oddsAndEnds/typeOf"],
    function(dojo, doh,
             _Cache,
             PersistentObject, StoreOfStateful, typeOf) {



      doh.register("_Cache", [

        function testConstructor() {
          var subject = new _Cache();
          doh.invars(subject);
          doh.t(subject._data);
          doh.t(typeOf(subject._data) === "object");
          doh.is(0, Object.keys(subject._data).length);
        }

//        {
//          name: "trackPo",
//          setUp: function() {},
//          runTest: function(){
//            var result = this.subject.getUrl(PersistentObject, "777");
//            console.log(result);
//            doh.is(baseUrl1 + PersistentObject.prototype.declaredClass.replace(/\./g, "/") + "/777", result);
//          }
//        }

      ]);
    }
);
