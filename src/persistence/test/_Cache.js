/*
 Copyright 2013 - $Date $ by PeopleWare n.v.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

define(["dojo/main", "ppwcode/contracts/doh",
        "../_Cache",
        "./mock/Person", "../PersistentObjectStore", "dojo/store/Observable",
        "ppwcode/oddsAndEnds/typeOf"],
  function(dojo, doh,
           _Cache,
           Person, PersistentObjectStore, Observable,
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
      personJson.persistenceId = persistenceId;
      person.reload(personJson);
      return person;
    }

    function getAndTestPersonEntry(cache, po, persistenceId, expectedNrOfReferers) {
      var tracked;
      if (expectedNrOfReferers) {
        tracked = cache.getByTypeAndId(Person.prototype.persistenceType, persistenceId);
        doh.is(po, tracked);
        tracked = cache.get(po);
        doh.is(po, tracked);
        // IDEA test breaks encapsulation -- whenever this fails, just remove the test
        doh.is(expectedNrOfReferers, cache._data[po.get("persistenceType") + "@" + persistenceId].getNrOfReferers());
      }
      else {
        tracked = cache.get(po);
        doh.f(tracked);
      }
    }

    var aPersistentObject = createPerson(99999);
    var toManyPropertyName = "TOMANY";

    function generateTests(what, payloadCreator, track, getAndTest) {
      return [
        {
          name: what + " track once",
          setUp: function() {
            this.payload = payloadCreator();
            this.subject = new _Cache();
          },
          runTest: function() {
            track(this.subject, this.payload, this);
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
            track(this.subject, this.payload, this);
            track(this.subject, this.payload, {});
            track(this.subject, this.payload, {});
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
            track(this.subject, this.payload, this);
            track(this.subject, this.payload, this.referer1);
            track(this.subject, this.payload, this.referer1);
            track(this.subject, this.payload, this.referer2);
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
            track(this.subject, this.payload, this);
            track(this.subject, this.payload, this.referer1);
            track(this.subject, this.payload, this.referer1);
            track(this.subject, this.payload, this.referer2);
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

            track(this.subject, this.payload, this.referer1);
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
          function(cache, po, referer) {
            cache.track(po, referer);
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
          this.subject.track(this.person1, this);
          this.subject.track(this.person1, this.referer1);
          this.subject.track(this.person1, this.referer2);

          this.subject.track(this.person2, this.referer1);
          this.subject.track(this.person3, this.person2);
          this.subject.track(this.person5, this.person4);
          this.subject.track(this.person4, this.person1);
          this.subject.track(this.person6, this.person5);
          this.subject.track(this.person6, this.referer1);

          this.subject.stopTracking(this.person1, this.referer1);
          this.subject.stopTracking(this.person1, this.referer2);
          this.subject.stopTracking(this.person1, this);

          var tracked = this.subject.get(this.person1);
          doh.f(tracked);
          tracked = this.subject.get(this.person4);
          doh.f(tracked);
          tracked = this.subject.get(this.person5);
          doh.f(tracked);
          tracked = this.subject.get(this.person2);
          doh.t(tracked);
          tracked = this.subject.get(this.person3);
          doh.t(tracked);
          tracked = this.subject.get(this.person6);
          doh.t(tracked);

          this.subject.stopTracking(this.person6, this.referer1);
          tracked = this.subject.get(this.person6);
          doh.f(tracked);
          tracked = this.subject.get(this.person2);
          doh.t(tracked);
          tracked = this.subject.get(this.person3);
          doh.t(tracked);

          this.subject.stopTracking(this.person2, this.referer1);
          tracked = this.subject.get(this.person2);
          doh.f(tracked);
          tracked = this.subject.get(this.person3);
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
