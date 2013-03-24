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

define(["dojo/main", "ppwcode/contracts/doh", "../AuditableObject"],
    function(dojo, doh, AuditableObject) {

      doh.register("ppwcode vernacular persistence AuditableObject", [

        function testConstructor1() {
          var persistenceId = 1;
          var createdAt = new Date();
          var createdBy = "creator";
          var lastModifiedAt = new Date();
          var lastModifiedBy = "modifier";
          var subject = new AuditableObject();
          subject.reload({persistenceId: persistenceId,
            createdAt: createdAt, createdBy: createdBy, lastModifiedAt: lastModifiedAt, lastModifiedBy: lastModifiedBy});
          doh.invars(subject);
          // post
          doh.is(createdAt, subject.get("createdAt"));
          doh.is(createdBy, subject.get("createdBy"));
          doh.is(lastModifiedAt, subject.get("lastModifiedAt"));
          doh.is(lastModifiedBy, subject.get("lastModifiedBy"));
        },

        function testConstructor2() {
          var subject = new AuditableObject();
          doh.invars(subject);
          // post
          doh.is(null, subject.get("createdAt"));
          doh.is(null, subject.get("createdBy"));
          doh.is(null, subject.get("lastModifiedAt"));
          doh.is(null, subject.get("lastModifiedBy"));
        },

        // MUDO test events

        function testReload1() {
          var subject = new AuditableObject();
          subject.reload();

          doh.invars(subject);
          // post
          doh.is(null, subject.get("createdAt"));
          doh.is(null, subject.get("createdBy"));
          doh.is(null, subject.get("lastModifiedAt"));
          doh.is(null, subject.get("lastModifiedBy"));
        },

        function testReload2() {
          var persistenceId = 1;
          var createdAt = new Date();
          var createdBy = "creator";
          var lastModifiedAt = new Date();
          var lastModifiedBy = "modifier";
          var subject = new AuditableObject({persistenceId: persistenceId,
            createdAt: createdAt, createdBy: createdBy, lastModifiedAt: lastModifiedAt, lastModifiedBy: lastModifiedBy});
          subject.reload();

          doh.invars(subject);
          // post
          doh.is(createdAt, subject.get("createdAt"));
          doh.is(createdBy, subject.get("createdBy"));
          doh.is(lastModifiedAt, subject.get("lastModifiedAt"));
          doh.is(lastModifiedBy, subject.get("lastModifiedBy"));
        },

        function testReload3() {
          var persistenceId = 1;
          var createdAt = new Date();
          var createdBy = "creator";
          var lastModifiedAt = new Date();
          var lastModifiedBy = "modifier";
          var subject = new AuditableObject();
          subject.reload({persistenceId: persistenceId,
            createdAt: createdAt, createdBy: createdBy, lastModifiedAt: lastModifiedAt, lastModifiedBy: lastModifiedBy});

          doh.invars(subject);
          // post
          doh.is(createdAt, subject.get("createdAt"));
          doh.is(createdBy, subject.get("createdBy"));
          doh.is(lastModifiedAt, subject.get("lastModifiedAt"));
          doh.is(lastModifiedBy, subject.get("lastModifiedBy"));
        },


        function testReload4() {
          var createdAt = new Date();
          var createdBy = "creator";
          var lastModifiedAt = new Date();
          var lastModifiedBy = "modifier";
          //noinspection MagicNumberJS
          var subject = new AuditableObject({persistenceId: 666,
            createdAt: createdAt, createdBy: createdBy, lastModifiedAt: new Date(), lastModifiedBy: "jos"});
          //noinspection MagicNumberJS
          subject.reload({persistenceId: 666,
            createdAt: createdAt, createdBy: createdBy, lastModifiedAt: lastModifiedAt, lastModifiedBy: lastModifiedBy});

          doh.invars(subject);
          // post
          doh.is(createdAt, subject.createdAt);
          doh.is(createdBy, subject.createdBy);
          doh.is(lastModifiedAt, subject.lastModifiedAt);
          doh.is(lastModifiedBy, subject.lastModifiedBy);
        },

        function testToJSON() {
          var subject = new AuditableObject();
          var result = subject.toJSON();

          doh.invars(subject);
          // post

          console.log(result);
        },

        function testToJSON() {
          var subject = new AuditableObject({persistenceId: 5,
            createdAt: new Date(), createdBy: "test", lastModifiedAt: new Date(), lastModifiedBy: "another"});
          var result = subject.toJSON();

          doh.invars(subject);
          // post

          console.log(result);
        },

        function testToString1() {
          var persistenceId = 1;
          var createdAt = new Date();
          var createdBy = "creator";
          var lastModifiedAt = new Date();
          var lastModifiedBy = "modifier";
          var subject = new AuditableObject();
          subject.reload({persistenceId: persistenceId,
            createdAt: createdAt, createdBy: createdBy, lastModifiedAt: lastModifiedAt, lastModifiedBy: lastModifiedBy});
          var result = subject.toString();
          doh.isNot(null, result);
          doh.t(typeof result === "string");
          doh.isNot("", result);
          console.log(result);
        },

        function testToString2() {
          var subject = new AuditableObject();
          var result = subject.toString();
          doh.isNot(null, result);
          doh.t(typeof result === "string");
          doh.isNot("", result);
          console.log(result);
        }

      ]);

    }
);
