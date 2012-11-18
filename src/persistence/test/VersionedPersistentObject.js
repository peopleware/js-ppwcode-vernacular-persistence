define(["dojo/main", "ppwcode/contracts/doh", "../VersionedPersistentObject"],
    function(dojo, doh, VersionedPersistentObject) {

      doh.register(VersionedPersistentObject.prototype.declaredClass, [

        function testConstructor1() {
          var persistenceId = 1;
          var persistenceVersion = 2;
          var subject = new VersionedPersistentObject({persistenceId: persistenceId, persistenceVersion: persistenceVersion});
          doh.invars(subject);
          // post
          doh.is(persistenceId, subject.persistenceId);
          doh.is(persistenceId, subject.get("persistenceId"));
          doh.is(persistenceVersion, subject.persistenceVersion);
          doh.is(persistenceVersion, subject.get("persistenceVersion"));
        },

        function testConstructor2() {
          var persistenceId = 1;
          var persistenceVersion = 2;
          var subject = new VersionedPersistentObject({});
          doh.invars(subject);
          // post
          doh.is(null, subject.persistenceId);
          doh.is(null, subject.get("persistenceId"));
          doh.is(null, subject.persistenceVersion);
          doh.is(null, subject.get("persistenceVersion"));
        },

        function testConstructor3() {
          var persistenceId = 1;
          var persistenceVersion = 2;
          var subject = new VersionedPersistentObject();
          doh.invars(subject);
          // post
          doh.is(null, subject.persistenceId);
          doh.is(null, subject.get("persistenceId"));
          doh.is(null, subject.persistenceVersion);
          doh.is(null, subject.get("persistenceVersion"));
        },

        // MUDO test events

        function testReload1() {
          var subject = new VersionedPersistentObject({persistenceId: 1, persistenceVersion: 884});
          subject.reload();

          doh.invars(subject);
          // post
          doh.is(884, subject.get("persistenceVersion"));
        },

        function testReload2a() {
          var subject = new VersionedPersistentObject({persistenceId: 1, persistenceVersion: 884});
          subject.reload({persistenceVersion: 885});

          doh.invars(subject);
          // post
          doh.is(885, subject.get("persistenceVersion"));
        },

        function testReload2b() {
          var subject = new VersionedPersistentObject({persistenceId: 1, persistenceVersion: 884});
          subject.reload({persistenceId: 1, persistenceVersion: 885});

          doh.invars(subject);
          // post
          doh.is(885, subject.get("persistenceVersion"));
        },

        function testReload3() {
          var subject = new VersionedPersistentObject({persistenceId: 1, persistenceVersion: 884});
          subject.reload({});

          doh.invars(subject);
          // post
          doh.is(884, subject.get("persistenceVersion"));
        },

        function testReload4() {
          var subject = new VersionedPersistentObject({persistenceId: 1, persistenceVersion: 884});
          subject.reload({persistenceId: 1, persistenceVersion: 884});

          doh.invars(subject);
          // post
          doh.is(884, subject.get("persistenceVersion"));
        },
//
//        function testReload5() {
//          var subject = new VersionedPersistentObject({persistenceId: 1, persistenceVersion: 884});
//          subject.reload({persistenceId: 1, persistenceVersion: 883});
//
//          doh.invars(subject);
//          // post
//          doh.is(884, subject.get("persistenceVersion"));
//        },

        function testToJsonObject() {
          var subject = new VersionedPersistentObject();
          var result = subject.toJsonObject();

          doh.invars(subject);
          // post

          console.log(result);
        },

        function testToJsonObject2() {
          var subject = new VersionedPersistentObject({persistenceId: 5, persistenceVersion: 8848});
          var result = subject.toJsonObject();

          doh.invars(subject);
          // post

          console.log(result);
        },

        function testToString1() {
          var persistenceId = 1;
          var persistenceVersion = 2;
          var subject = new VersionedPersistentObject({persistenceId: persistenceId, persistenceVersion: persistenceVersion});
          var result = subject.toString();
          doh.isNot(null, result);
          doh.t(typeof result === "string");
          doh.isNot("", result);
          console.log(result);
        },

        function testToString2() {
          var subject = new VersionedPersistentObject({});
          var result = subject.toString();
          doh.isNot(null, result);
          doh.t(typeof result === "string");
          doh.isNot("", result);
          console.log(result);
        }
      ]);

    }
);
