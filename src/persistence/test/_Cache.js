define(["dojo/main", "ppwcode/contracts/doh",
        "../_Cache",
        "./mock/Person", "ppwcode/collections/StoreOfStateful",
        "ppwcode/oddsAndEnds/typeOf"],
  function(dojo, doh,
           _Cache,
           Person, StoreOfStateful,
           typeOf) {


    var personId1 = 898942;
    var personJson = {
      "name":"Pete Peeters",
      "street":"Avenue de rue 93",
      "zip":"1040 CAA",
      "city":"Cité de Beauté",
      "tel":"0322 44 442 22"
    };

    function createPerson(persistenceId) {
      var person = new Person();
      person.persistenceId = persistenceId;
      person.reload(personJson);
      return person;
    }

    function getAndTestPersonEntry(cache, po, persistenceId, expectedNrOfReferers) {
      var tracked;
      if (expectedNrOfReferers) {
        tracked = cache.getPoByTypeAndId(po.get("persistenceType"), persistenceId);
        doh.is(po, tracked);
        tracked = cache.getPo(po);
        doh.is(po, tracked);
        // IDEA test breaks encapsulation -- whenever this fails, just remove the test
        doh.is(expectedNrOfReferers, cache._data[po.get("persistenceType") + "@" + persistenceId].getNrOfReferers());
      }
      else {
        tracked = cache.getPo(po);
        doh.f(tracked);
      }
    }

    function generateTests(what, payloadCreator, getAndTest) {
      return [
        {
          name: what + " track once",
          setUp: function() {
            this.payload = payloadCreator();
            this.subject = new _Cache();
          },
          runTest: function() {
            this.subject.trackPo(this.payload, this);
            getAndTest(this.subject, this.payload, 1);
            console.log(JSON.stringify(this.subject.report()));
          },
          tearDown: function() {
            delete this.payload;
            delete this.subject;
          }
        },

        {
          name: what + " track trice",
          setUp: function() {
            this.payload = payloadCreator();
            this.subject = new _Cache();
          },
          runTest: function() {
            this.subject.trackPo(this.payload, this);
            this.subject.trackPo(this.payload, {});
            this.subject.trackPo(this.payload, {});
            getAndTest(this.subject, this.payload, 3);
            console.log(JSON.stringify(this.subject.report()));
          },
          tearDown: function() {
            delete this.payload;
            delete this.subject;
          }
        },

        {
          name: what + " track quatro",
          setUp: function() {
            this.payload = payloadCreator();
            this.subject = new _Cache();
            this.referer1 = {};
            this.referer2 = {};
          },
          runTest: function() {
            this.subject.trackPo(this.payload, this);
            this.subject.trackPo(this.payload, this.referer1);
            this.subject.trackPo(this.payload, this.referer1);
            this.subject.trackPo(this.payload, this.referer2);
            getAndTest(this.subject, this.payload, 3);
            console.log(JSON.stringify(this.subject.report()));
          },
          tearDown: function() {
            delete this.payload;
            delete this.subject;
            delete this.referer1;
            delete this.referer2;
          }
        },

        {
          name: what + " stop tracking",
          setUp: function() {
            this.payload = payloadCreator();
            this.subject = new _Cache();
            this.referer1 = {};
            this.referer2 = {};
          },
          runTest: function() {
            this.subject.trackPo(this.payload, this);
            this.subject.trackPo(this.payload, this.referer1);
            this.subject.trackPo(this.payload, this.referer1);
            this.subject.trackPo(this.payload, this.referer2);
            getAndTest(this.subject, this.payload, 3);
            console.log(JSON.stringify(this.subject.report()));

            this.subject.stopTracking(this.payload, {});
            getAndTest(this.subject, this.payload, 3);
            console.log(JSON.stringify(this.subject.report()));

            this.subject.stopTracking(this.payload, this.referer1);
            getAndTest(this.subject, this.payload, 2);
            console.log(JSON.stringify(this.subject.report()));

            this.subject.stopTracking(this.payload, this.referer2);
            getAndTest(this.subject, this.payload, 1);
            console.log(JSON.stringify(this.subject.report()));

            this.subject.trackPo(this.payload, this.referer1);
            getAndTest(this.subject, this.payload, 2);
            console.log(JSON.stringify(this.subject.report()));

            this.subject.stopTracking(this.payload, this.referer1);
            getAndTest(this.subject, this.payload, 1);
            console.log(JSON.stringify(this.subject.report()));

            this.subject.stopTracking(this.payload, this);
            getAndTest(this.subject, this.payload, 0);
            console.log(JSON.stringify(this.subject.report()));
          },
          tearDown: function() {
            delete this.payload;
            delete this.subject;
            delete this.referer1;
            delete this.referer2;
          }
        }
      ]
    }


    doh.register("_Cache",

      [
        function testConstructor() {
          var subject = new _Cache();
          doh.invars(subject);
          doh.t(subject._data);
          doh.t(typeOf(subject._data) === "object");
          doh.is(0, Object.keys(subject._data).length);
        }
      ]
      .concat(
        generateTests(
          "PersistentObject",
          function() {
            return createPerson(personId1);
          },
          function(cache, payload, expectedNrOfReferers) {
            getAndTestPersonEntry(cache, payload, personId1, expectedNrOfReferers);
          }
        )
      )
      .concat([{
        name: "recursiveStopTracking",
        setUp: function() {
          this.person1 = createPerson(personId1);
          this.person2 = createPerson(85029859025);
          this.person3 = createPerson(752890);
          this.person4 = createPerson(578059230);
          this.person5 = createPerson(74924902890);
          this.person6 = createPerson(524523523);
          this.subject = new _Cache();
          this.referer1 = {};
          this.referer2 = {};
        },
        runTest: function() {
          this.subject.trackPo(this.person1, this);
          this.subject.trackPo(this.person1, this.referer1);
          this.subject.trackPo(this.person1, this.referer2);

          this.subject.trackPo(this.person2, this.referer1);
          this.subject.trackPo(this.person3, this.person2);
          this.subject.trackPo(this.person5, this.person4);
          this.subject.trackPo(this.person4, this.person1);
          this.subject.trackPo(this.person6, this.person5);
          this.subject.trackPo(this.person6, this.referer1);

          this.subject.stopTracking(this.person1, this.referer1);
          this.subject.stopTracking(this.person1, this.referer2);
          this.subject.stopTracking(this.person1, this);

          var tracked = this.subject.getPo(this.person1);
          doh.f(tracked);
          tracked = this.subject.getPo(this.person4);
          doh.f(tracked);
          tracked = this.subject.getPo(this.person5);
          doh.f(tracked);
          tracked = this.subject.getPo(this.person2);
          doh.t(tracked);
          tracked = this.subject.getPo(this.person3);
          doh.t(tracked);
          tracked = this.subject.getPo(this.person6);
          doh.t(tracked);

          this.subject.stopTracking(this.person6, this.referer1);
          tracked = this.subject.getPo(this.person6);
          doh.f(tracked);
          tracked = this.subject.getPo(this.person2);
          doh.t(tracked);
          tracked = this.subject.getPo(this.person3);
          doh.t(tracked);

          this.subject.stopTracking(this.person2, this.referer1);
          tracked = this.subject.getPo(this.person2);
          doh.f(tracked);
          tracked = this.subject.getPo(this.person3);
          doh.f(tracked);

          console.log(JSON.stringify(this.subject.report()));
        },
        tearDown: function() {
          delete this.person1;
          delete this.person2;
          delete this.person3;
          delete this.person4;
          delete this.person5;
          delete this.person6;
          delete this.subject;
          delete this.referer1;
          delete this.referer2;
        }
      }])

    );
  }
);
