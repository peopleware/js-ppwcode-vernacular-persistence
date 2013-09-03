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

define(["ppwcode-util-contracts/doh",
        "../PersistentObject",
        "dojo/_base/declare", "dojo/_base/lang"],
  function(doh,
           PersistentObject,
           declare, lang) {

    var type = "SOME TYPE DESCRIPTOR";
    var Mock = declare([PersistentObject], {
      getTypeDescription: function() {return type;}
    });

    function generateMock(id) {
      var mock = new Mock();
      mock.reload({persistenceId: id});
      return mock;
    }

    doh.register("ppwcode vernacular persistence PersistentObject", [

      function testConstructor1() {
        var persistenceId = 1;
        var subject = generateMock(persistenceId);

        doh.invars(subject);
        // post
        doh.is(persistenceId, subject.get("persistenceId"));
      },

      function testConstructor2() {
        var subject = generateMock(null);

        doh.invars(subject);
        // post
        doh.is(null, subject.get("persistenceId"));
      },

      function testConstructor3() {
        var subject = new Mock();

        doh.invars(subject);
        // post
        doh.is(null, subject.get("persistenceId"));
      },

      function testReload1() {
        var persistenceId = 1;
        var subject = generateMock(persistenceId);
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
        var subject = generateMock(persistenceId);
        var listenerCalled1 = false;
        var listenerCalled2 = false;
        subject.watch("persistenceId", function( propertyName, oldValue, newValue) {
          listenerCalled1 = true;
        });
        subject.watch(function(propertyName, oldValue, newValue) {
          listenerCalled2 = true;
        });
        subject.reload({persistenceId: 1});

        doh.invars(subject);
        // post
        doh.is(persistenceId, subject.get("persistenceId"));
        doh.f(listenerCalled1);
        doh.f(listenerCalled2);
      },

      function testReload3() {
        var persistenceId = 1;
        var subject = generateMock(persistenceId);
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
        var subject = generateMock(null);
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

      function testReload5() {
        var subject = generateMock(5);
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
        subject.watch("persistenceId", function(propertyName, oldValue, newValue) {
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
        subject.reload({persistenceId: null});

        doh.invars(subject);
        // post
        doh.is(null, subject.get("persistenceId"));
        doh.t(listenerCalled1);
        doh.is(subject, eventOrigin1);
        doh.is("persistenceId", eventPropertyName1);
        doh.is(5, eventOldValue1);
        doh.is(null, eventNewValue1);
        doh.t(listenerCalled2);
        doh.is(subject, eventOrigin2);
        doh.is("persistenceId", eventPropertyName2);
        doh.is(5, eventOldValue2);
        doh.is(null, eventNewValue2);
      },

      function testToJSON1() {
        var subject = new Mock();
        var result = subject.toJSON();

        doh.invars(subject);
        // post

        console.log(result);
      },

      function testToJSON2() {
        var subject = generateMock(5);
        var result = subject.toJSON();

        doh.invars(subject);
        // post

        console.log(result);
      },

      function testToString1() {
        var persistenceId = 1;
        var subject = generateMock(persistenceId);
        var result = subject.toString();
        doh.isNot(null, result);
        doh.t(typeof result === "string");
        doh.isNot("", result);
        console.log(result);
      },

      function testToString2() {
        var subject = new Mock();
        var result = subject.toString();
        doh.isNot(null, result);
        doh.t(typeof result === "string");
        doh.isNot("", result);
        console.log(result);
      },

      function testKeyForId() {
        var id = 9859893;
        var key = PersistentObject.keyForId(type, id);
        doh.t(lang.isString(key));
        doh.is(type + "@" + id, key);
      },

      function testKeyForObject() {
        var subject = generateMock(5);
        var key = PersistentObject.keyForObject(subject);
        doh.t(lang.isString(key));
        doh.is(type + "@" + 5, key);
      },

      function testGetKey() {
        var subject = generateMock(5);
        var key = subject.getKey();
        doh.t(lang.isString(key));
        doh.is(type + "@" + 5, key);
      }

    ]);

  }
);
