define(["dojo/main", "ppwcode/contracts/doh",
        "../_Cache",
        "./mock/Person", "ppwcode/collections/StoreOfStateful",
        "ppwcode/oddsAndEnds/typeOf"],
    function(dojo, doh,
             _Cache,
             Person, StoreOfStateful,
             typeOf) {


      var personId = 898942;
      var personJson = {
        "persistenceId":personId,
        "name":"Pete Peeters",
        "street":"Avenue de rue 93",
        "zip":"1040 CAA",
        "city":"Cité de Beauté",
        "tel":"0322 44 442 22"
      };

      function createPerson() {
        var person = new Person();
        person.reload(personJson);
        return person;
      }

      doh.register("_Cache", [

        function testConstructor() {
          var subject = new _Cache();
          doh.invars(subject);
          doh.t(subject._data);
          doh.t(typeOf(subject._data) === "object");
          doh.is(0, Object.keys(subject._data).length);
        },

        {
          name: "trackPo once",
          setUp: function() {
            this.person = createPerson();
            this.subject = new _Cache();
          },
          runTest: function() {
            this.subject.trackPo(this.person, this);
            var tracked = this.subject.getPoByTypeAndId(this.person.get("persistenceType"), personId);
            doh.is(this.person, tracked);
            tracked = this.subject.getPo(this.person);
            doh.is(this.person, tracked);
            console.log(JSON.stringify(this.subject.report()));
          },
          tearDown: function() {
            delete this.person;
            delete this.subject;
          }
        },

        {
          name: "trackPo trice",
          setUp: function() {
            this.person = createPerson();
            this.subject = new _Cache();
          },
          runTest: function() {
            this.subject.trackPo(this.person, this);
            this.subject.trackPo(this.person, {});
            this.subject.trackPo(this.person, {});
            var tracked = this.subject.getPoByTypeAndId(this.person.get("persistenceType"), personId);
            doh.is(this.person, tracked);
            tracked = this.subject.getPo(this.person);
            doh.is(this.person, tracked);
            console.log(JSON.stringify(this.subject.report()));
          },
          tearDown: function() {
            delete this.person;
            delete this.subject;
          }
        }

      ]);
    }
);
