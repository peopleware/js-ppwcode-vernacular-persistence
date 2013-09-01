/*
 Copyright 2012 - $Date $ by PeopleWare n.v.

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

define(["ppwcode-util-contracts/doh", "../VersionedPersistentObject"],
    function(doh, VersionedPersistentObject) {

      doh.register("ppwcode vernacular persistence VersionedPersistentObject", [

        function testConstructor1() {
          var persistenceId = 1;
          var persistenceVersion = 2;
          var subject = new VersionedPersistentObject();
          subject.reload({persistenceId: persistenceId, persistenceVersion: persistenceVersion});
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
          //noinspection MagicNumberJS
          var subject = new VersionedPersistentObject();
          subject.reload({persistenceId: 1, persistenceVersion: 884});
          subject.reload();

          doh.invars(subject);
          // post
          //noinspection MagicNumberJS
          doh.is(884, subject.get("persistenceVersion"));
        },

        function testReload2a() {
          //noinspection MagicNumberJS
          var subject = new VersionedPersistentObject();
          subject.reload({persistenceId: 1, persistenceVersion: 884});
          //noinspection MagicNumberJS
          subject.reload({persistenceId: 1, persistenceVersion: 885});

          doh.invars(subject);
          // post
          //noinspection MagicNumberJS
          doh.is(885, subject.get("persistenceVersion"));
        },

        function testReload2b() {
          //noinspection MagicNumberJS
          var subject = new VersionedPersistentObject();
          subject.reload({persistenceId: 1, persistenceVersion: 884});
          //noinspection MagicNumberJS
          subject.reload({persistenceId: 1, persistenceVersion: 885});

          doh.invars(subject);
          // post
          //noinspection MagicNumberJS
          doh.is(885, subject.get("persistenceVersion"));
        },

        function testReload3() {
          //noinspection MagicNumberJS
          var subject = new VersionedPersistentObject();
          subject.reload({persistenceId: 1, persistenceVersion: 884});
          subject.reload();

          doh.invars(subject);
          // post
          //noinspection MagicNumberJS
          doh.is(884, subject.get("persistenceVersion"));
        },

        function testReload4() {
          //noinspection MagicNumberJS
          var subject = new VersionedPersistentObject();
          subject.reload({persistenceId: 1, persistenceVersion: 884});
          //noinspection MagicNumberJS
          subject.reload({persistenceId: 1, persistenceVersion: 884});

          doh.invars(subject);
          // post
          //noinspection MagicNumberJS
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

        function testToJSON() {
          var subject = new VersionedPersistentObject();
          var result = subject.toJSON();

          doh.invars(subject);
          // post

          console.log(result);
        },

        function testToJSON2() {
          //noinspection MagicNumberJS
          var subject = new VersionedPersistentObject();
          subject.reload({persistenceId: 5, persistenceVersion: 8848});
          var result = subject.toJSON();

          doh.invars(subject);
          // post

          console.log(result);
        },

        function testToString1() {
          var persistenceId = 1;
          var persistenceVersion = 2;
          var subject = new VersionedPersistentObject();
          subject.reload({persistenceId: persistenceId, persistenceVersion: persistenceVersion});
          var result = subject.toString();
          doh.isNot(null, result);
          doh.t(typeof result === "string");
          doh.isNot("", result);
          console.log(result);
        },

        function testToString2() {
          var subject = new VersionedPersistentObject();
          var result = subject.toString();
          doh.isNot(null, result);
          doh.t(typeof result === "string");
          doh.isNot("", result);
          console.log(result);
        }
      ]);

    }
);
