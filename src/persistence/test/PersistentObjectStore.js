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

define(["ppwcode-util-contracts/doh",
        "../PersistentObjectStore", "../PersistentObject", "dojo/store/Observable",
        "dojo/_base/declare", "dojo/_base/lang"],
  function(doh,
           PersistentObjectStore, PersistentObject, Observable,
           declare, lang) {

    var type = "SOME TYPE DESCRIPTOR";
    var Mock = declare([PersistentObject], {
      getTypeDescription: function() {return type;}
    });

    doh.register("PersistentObjectStore", [

      function testConstructor() {
        var subject = new PersistentObjectStore();
        doh.invars(subject);
      },

      function testConstructor() {
        var subject = Observable(new PersistentObjectStore());
        doh.invars(subject);
      },

      function testKeyForId() {
        var id = 9859893;
        var toMany = "A TOO MANY NAME";
        var key = PersistentObjectStore.keyForId(Mock, id, toMany);
        doh.t(lang.isString(key));
        doh.is(type + "@" + id + "/" + toMany, key);
      },

      function testKeyForObject() {
        var id = 9859893;
        var subject = new Mock({persistenceId: id});
        var toMany = "A TOO MANY NAME";
        var key = PersistentObjectStore.keyForObject(subject, toMany);
        doh.t(lang.isString(key));
        doh.is(type + "@" + id + "/" + toMany, key);
      }

    ]);

  }
);
