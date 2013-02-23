define(["dojo/main", "ppwcode/contracts/doh", "../PersistentObject"],
    function(dojo, doh, PersistentObject) {

      doh.register(PersistentObject.prototype.declaredClass, [

        function testConstructor1() {
          var persistenceId = 1;
          var subject = new PersistentObject({persistenceId: persistenceId});

          doh.invars(subject);
          // post
          doh.is(persistenceId, subject.get("persistenceId"));
        },

        function testConstructor2() {
          var subject = new PersistentObject({});

          doh.invars(subject);
          // post
          doh.is(null, subject.get("persistenceId"));
        },

        function testConstructor3() {
          var subject = new PersistentObject();

          doh.invars(subject);
          // post
          doh.is(null, subject.get("persistenceId"));
        },

        function testReload1() {
          var persistenceId = 1;
          var subject = new PersistentObject({persistenceId: persistenceId});
          var listenerCalled1 = false;
          var listenerCalled2 = false;
          subject.watch("persistenceId", function( propertyName, oldValue, newValue) {
            listenerCalled1 = true;
          });
          subject.watch(function(propertyName, oldValue, newValue) {
            listenerCalled2 = true;
          });
          subject.reload();

          doh.invars(subject);
          // post
          doh.is(persistenceId, subject.get("persistenceId"));
          doh.f(listenerCalled1);
          doh.f(listenerCalled2);
        },

        function testReload2() {
          var persistenceId = 1;
          var subject = new PersistentObject({persistenceId: persistenceId});
          var listenerCalled1 = false;
          var listenerCalled2 = false;
          subject.watch("persistenceId", function( propertyName, oldValue, newValue) {
            listenerCalled1 = true;
          });
          subject.watch(function(propertyName, oldValue, newValue) {
            listenerCalled2 = true;
          });
          subject.reload({});

          doh.invars(subject);
          // post
          doh.is(persistenceId, subject.get("persistenceId"));
          doh.f(listenerCalled1);
          doh.f(listenerCalled2);
        },

        function testReload3() {
          var persistenceId = 1;
          var subject = new PersistentObject({persistenceId: persistenceId});
          var listenerCalled1 = false;
          var listenerCalled2 = false;
          subject.watch("persistenceId", function( propertyName, oldValue, newValue) {
            listenerCalled1 = true;
          });
          subject.watch(function(propertyName, oldValue, newValue) {
            listenerCalled2 = true;
          });
          subject.reload(null);

          doh.invars(subject);
          // post
          doh.is(persistenceId, subject.get("persistenceId"));
          doh.f(listenerCalled1);
          doh.f(listenerCalled2);
        },

        function testReload4() {
          var subject = new PersistentObject({persistenceId: null});
          var listenerCalled1 = false;
          var eventOrigin1 = null;
          var eventPropertyName1 = null;
          var eventOldValue1 = null;
          var eventNewValue1 = null;
          var listenerCalled2 = false;
          var eventOrigin2 = null;
          var eventPropertyName2 = null;
          var eventOldValue2 = null;
          var eventNewValue2 = null;
          subject.watch("persistenceId", function( propertyName, oldValue, newValue) {
            listenerCalled1 = true;
            eventOrigin1 = this;
            eventPropertyName1 = propertyName;
            eventOldValue1 = oldValue;
            eventNewValue1 = newValue;
          });
          subject.watch(function(propertyName, oldValue, newValue) {
            listenerCalled2 = true;
            eventOrigin2 = this;
            eventPropertyName2 = propertyName;
            eventOldValue2 = oldValue;
            eventNewValue2 = newValue;
          });
          subject.reload({persistenceId: 5});

          doh.invars(subject);
          // post
          doh.is(5, subject.get("persistenceId"));
          doh.t(listenerCalled1);
          doh.is(subject, eventOrigin1);
          doh.is("persistenceId", eventPropertyName1);
          doh.is(null, eventOldValue1);
          doh.is(5, eventNewValue1);
          doh.t(listenerCalled2);
          doh.is(subject, eventOrigin2);
          doh.is("persistenceId", eventPropertyName2);
          doh.is(null, eventOldValue2);
          doh.is(5, eventNewValue2);
        },

        function testToJSON1() {
          var subject = new PersistentObject();
          var result = subject.toJSON();

          doh.invars(subject);
          // post

          console.log(result);
        },

        function testToJSON2() {
          var subject = new PersistentObject({persistenceId: 5});
          var result = subject.toJSON();

          doh.invars(subject);
          // post

          console.log(result);
        },

        function testToString1() {
          var persistenceId = 1;
          var subject = new PersistentObject({persistenceId: persistenceId});
          var result = subject.toString();
          doh.isNot(null, result);
          doh.t(typeof result === "string");
          doh.isNot("", result);
          console.log(result);
        },

        function testToString2() {
          var subject = new PersistentObject({});
          var result = subject.toString();
          doh.isNot(null, result);
          doh.t(typeof result === "string");
          doh.isNot("", result);
          console.log(result);
        }

      ]);

    }
);
