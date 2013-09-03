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

define(["ppwcode-util-contracts/doh", "./mock/CrudDao1",
        "../PersistentObject", "../IdNotFoundException", "dojo/_base/declare"],
    function(doh, CrudDaoMock, PersistentObject, IdNotFoundException, declare) {

      var subjectSetup = function() {
        var subject = new CrudDaoMock();
        this.subject = subject;
      };

      var typeDescription = "A PERSISTENCE TYPE";

      var MockPo = declare([PersistentObject], {

        getTypeDescription: function() {return typeDescription;},

        testProperty: 5,

        constructor: function() {
          this.testProperty = 3;
        },

        reload: function(kwargs) {
          if (kwargs.testProperty) {
            this.set("testProperty", kwargs.testProperty);
          }
        },

        _extendJsonObject: function(/*Object*/ json) {
          json.testProperty = this.testProperty;
        }

      });

      function createMockPo() {
        var result = new MockPo();
        result.reload({persistenceId: 777});
        return result;
      }

      function getCacheEntry(crudDao, po) {
        var key = crudDao._cache._lookupKeyOf(po);
        return crudDao._cache._data[key];
      }

      function testCreate(subject, waitMillis, semanticException, error) {
        var p = new MockPo({persistenceId: null});
        if (waitMillis) {
          p.waitMillis = waitMillis;
        }
        if (semanticException) {
          p.semanticException = semanticException;
        }
        if (error) {
          p.error = error;
        }
        var tracker1 = {};
        var persistenceIdEvent = null;
        p.watch("persistenceId", function(propertyName, oldValue, newValue) {
          persistenceIdEvent = {
            propertyName: propertyName,
            oldValue: oldValue,
            newValue: newValue
          }
        });
        var deferred = new doh.Deferred();
        var resultPromise = subject.create(p, tracker1);
        doh.t(resultPromise);
        resultPromise.then(
          function(pSuccess) {
            try {
              doh.is(p, pSuccess);
              doh.t(p.persistenceId);
              doh.t(persistenceIdEvent);
              doh.is("persistenceId", persistenceIdEvent.propertyName);
              doh.is(null, persistenceIdEvent.oldValue);
              doh.is(p.get("persistenceId"), persistenceIdEvent.newValue);
              var ce = getCacheEntry(subject, p);
              doh.t(ce);
              doh.is(p, ce.payload);
              doh.is(1, ce.getNrOfReferers());
              doh.t(ce._referers.contains(tracker1));
              deferred.callback(true);
            }
            catch (error) {
              deferred.errback(error);
            }
          },
          function(problem) {
            try {
              doh.is(null, p.persistenceId);
              doh.f(persistenceIdEvent);
              if (error) {
                console.log("Expected error message: " + error);
              }
              else if (semanticException) {
                doh.is(semanticException, problem);
              }
              else {
                doh.fail();
              }
              deferred.callback(true);
            }
            catch (error) {
              deferred.errback(error);
            }
          }
        );
        return deferred;
      }

      function testUpdateNothingChanged(subject, p, persistenceIdEvent, firstTestPropertyEvent, testPropertyEvent, tracker) {
        doh.t(p.persistenceId);
        doh.is(777, p.get("persistenceId"));
        doh.f(persistenceIdEvent);
        var ce = getCacheEntry(subject, p);
        doh.t(ce);
        doh.is(p, ce.payload);
        doh.is(1, ce.getNrOfReferers());
        doh.t(ce._referers.contains(tracker));
        doh.is(9, p.get("testProperty"));
        doh.is(firstTestPropertyEvent, testPropertyEvent);
      }

      function removedFromServer(subject, p, persistenceIdEvent, testPropertyValue, firstTestPropertyEvent, testPropertyEvent) {
        doh.is(null, p.get("persistenceId"));
        doh.t(persistenceIdEvent);
        doh.is("persistenceId", persistenceIdEvent.propertyName);
        doh.is(777, persistenceIdEvent.oldValue);
        doh.is(null, persistenceIdEvent.newValue);
        var ce = getCacheEntry(subject, p);
        doh.f(ce);
        doh.is(testPropertyValue, p.get("testProperty"));
        doh.is(firstTestPropertyEvent, testPropertyEvent);
      }

      function testUpdate(subject, waitMillis, semanticException, error) {
        var p = createMockPo();
        if (waitMillis) {
          p.waitMillis = waitMillis;
        }
        if (semanticException) {
          p.semanticException = semanticException;
        }
        if (error) {
          p.error = error;
        }
        var tracker1 = {};
        subject.track(p, tracker1);
        var persistenceIdEvent = null;
        p.watch("persistenceId", function(propertyName, oldValue, newValue) {
          persistenceIdEvent = {
            propertyName: propertyName,
            oldValue: oldValue,
            newValue: newValue
          }
        });
        var testPropertyEvent = null;
        p.watch("testProperty", function(propertyName, oldValue, newValue) {
          testPropertyEvent = {
            propertyName: propertyName,
            oldValue: oldValue,
            newValue: newValue
          }
        });
        p.set("testProperty", 9);
        var firstTestPropertyEvent = testPropertyEvent;
        doh.t(testPropertyEvent);
        doh.is("testProperty", testPropertyEvent.propertyName);
        doh.is(3, testPropertyEvent.oldValue);
        doh.is(9, testPropertyEvent.newValue);
        var deferred = new doh.Deferred();
        var resultPromise = subject.update(p);
        doh.t(resultPromise);
        resultPromise.then(
          function(pSuccess) {
            try {
              doh.is(p, pSuccess);
              testUpdateNothingChanged(subject, p, persistenceIdEvent, firstTestPropertyEvent, testPropertyEvent, tracker1);
              deferred.callback(true);
            }
            catch (error) {
              deferred.errback(error);
            }
          },
          function(problem) {
            try {
              if (error) {
                console.log("Expected error message: " + error);
                testUpdateNothingChanged(subject, p, persistenceIdEvent, firstTestPropertyEvent, testPropertyEvent, tracker1);
              }
              else if (semanticException) {
                doh.is(semanticException, problem);
                if (semanticException.isInstanceOf && semanticException.isInstanceOf(IdNotFoundException)) {
                  removedFromServer(subject, p, persistenceIdEvent, 9, firstTestPropertyEvent, testPropertyEvent);
                }
                else {
                  testUpdateNothingChanged(subject, p, persistenceIdEvent, firstTestPropertyEvent, testPropertyEvent, tracker1);
                }
              }
              else {
                doh.fail();
              }
              deferred.callback(true);
            }
            catch (error) {
              deferred.errback(error);
            }
          }
        );
        return deferred;
      }

      function testDeleteIdChanged(subject, p, persistenceIdEvent, testPropertyEvent) {
        doh.is(null, p.get("persistenceId"));
        doh.t(persistenceIdEvent);
        doh.is("persistenceId", persistenceIdEvent.propertyName);
        doh.is(777, persistenceIdEvent.oldValue);
        doh.is(null, persistenceIdEvent.newValue);
        var ce = getCacheEntry(subject, p);
        doh.f(ce);
        testDeleteNoChange(p, testPropertyEvent);
      }

      function testDeleteNothingChanged(subject, p, persistenceIdEvent, testPropertyEvent, tracker) {
        doh.t(p.get("persistenceId"));
        doh.is(777, p.get("persistenceId"));
        doh.f(persistenceIdEvent);

        var ce = getCacheEntry(subject, p);
        doh.t(ce);
        doh.is(p, ce.payload);
        doh.is(1, ce.getNrOfReferers());
        doh.t(ce._referers.contains(tracker));
        testDeleteNoChange(p, testPropertyEvent);
      }

      function testDeleteNoChange(p, testPropertyEvent) {
        doh.is(3, p.get("testProperty"));
        doh.f(testPropertyEvent);
      }

      function testDelete(subject, waitMillis, semanticException, error) {
        var p = createMockPo();
        if (waitMillis) {
          p.waitMillis = waitMillis;
        }
        if (semanticException) {
          p.semanticException = semanticException;
        }
        if (error) {
          p.error = error;
        }
        var tracker1 = {};
        subject.track(p, tracker1);
        var persistenceIdEvent = null;
        p.watch("persistenceId", function(propertyName, oldValue, newValue) {
          persistenceIdEvent = {
            propertyName: propertyName,
            oldValue: oldValue,
            newValue: newValue
          }
        });
        var testPropertyEvent = null;
        p.watch("testProperty", function(propertyName, oldValue, newValue) {
          testPropertyEvent = {
            propertyName: propertyName,
            oldValue: oldValue,
            newValue: newValue
          }
        });
        var deferred = new doh.Deferred();
        var resultPromise = subject.remove(p);
        doh.t(resultPromise);
        resultPromise.then(
          function(pSuccess) {
            try {
              doh.is(p, pSuccess);
              testDeleteIdChanged(subject, p, persistenceIdEvent, testPropertyEvent);
              deferred.callback(true);
            }
            catch (error) {
              deferred.errback(error);
            }
          },
          function(problem) {
            try {
              if (error) {
                console.log("Expected error message: " + error);
                testDeleteNothingChanged(subject, p, persistenceIdEvent, testPropertyEvent, tracker1);
              }
              else if (semanticException) {
                doh.is(semanticException, problem);
                testDeleteNothingChanged(subject, p, persistenceIdEvent, testPropertyEvent, tracker1);
              }
              else {
                doh.fail();
              }
              deferred.callback(true);
            }
            catch (error) {
              deferred.errback(error);
            }
          }
        );
        return deferred;
      }

      function testGetNothingChanged(subject, p, persistenceIdEvent, oldTestValue, testPropertyEvent, tracker1, tracker2) {
        doh.t(p.persistenceId);
        doh.f(persistenceIdEvent);
        doh.is(p.get("testProperty"), oldTestValue);
        doh.f(testPropertyEvent);
        var ce = getCacheEntry(subject, p);
        doh.t(ce);
        doh.is(p, ce.payload);
        doh.is(2, ce.getNrOfReferers());
        doh.t(ce._referers.contains(tracker1));
        doh.t(ce._referers.contains(tracker2));
      }

      function testGetCached(subject, waitMillis, idNotFoundException, error) {
        var id = 777;
        var p = new MockPo();
        p.reload({persistenceId: id});
        var oldTestValue = p.get("testProperty");
        var tracker1 = {};
        subject.track(p, tracker1);
        var persistenceIdEvent = null;
        p.watch("persistenceId", function(propertyName, oldValue, newValue) {
          persistenceIdEvent = {
            propertyName: propertyName,
            oldValue: oldValue,
            newValue: newValue
          }
        });
        var testPropertyEvent = null;
        p.watch("testProperty", function(propertyName, oldValue, newValue) {
          testPropertyEvent = {
            propertyName: propertyName,
            oldValue: oldValue,
            newValue: newValue
          }
        });
        var tracker2 = {};
        tracker2.PoType = MockPo;
        tracker2.resultJson = { persistenceId: 777 };
        var newTestValue = 9;
        tracker2.resultJson.testProperty = newTestValue;
        if (waitMillis) {
          tracker2.waitMillis = waitMillis;
        }
        if (idNotFoundException) {
          tracker2.idNotFoundException = idNotFoundException;
        }
        if (error) {
          tracker2.error = error;
        }
        var deferred = new doh.Deferred();
        var resultPromise = subject.retrieve(typeDescription, id, tracker2);
        doh.t(resultPromise);
        resultPromise.then(
          function(pSuccess) {
            try {
              doh.is(p, pSuccess);
              doh.t(p.persistenceId);
              doh.f(persistenceIdEvent);
              doh.is(p.get("testProperty"), newTestValue);
              doh.t(testPropertyEvent);
              doh.is("testProperty", testPropertyEvent.propertyName);
              doh.is(oldTestValue, testPropertyEvent.oldValue);
              doh.is(newTestValue, testPropertyEvent.newValue);
              var ce = getCacheEntry(subject, p);
              doh.t(ce);
              doh.is(p, ce.payload);
              doh.is(2, ce.getNrOfReferers());
              doh.t(ce._referers.contains(tracker1));
              doh.t(ce._referers.contains(tracker2));
              deferred.callback(true);
            }
            catch (error) {
              deferred.errback(error);
            }
          },
          function(problem) {
            try {
              if (error) {
                console.log("Expected error message: " + error);
                testGetNothingChanged(subject, p, persistenceIdEvent, oldTestValue, testPropertyEvent, tracker1, tracker2);
              }
              else if (idNotFoundException) {
                doh.is(idNotFoundException, problem);
                removedFromServer(subject, p, persistenceIdEvent, oldTestValue, testPropertyEvent, testPropertyEvent);
              }
              else {
                doh.fail();
              }
              deferred.callback(true);
            }
            catch (error) {
              deferred.errback(error);
            }
          }
        );
        return deferred;
      }

      function testGetNonCached(subject, waitMillis, idNotFoundException, error) {
        var id = 777;
        var tracker2 = {};
        tracker2.resultJson = { persistenceId: 777 };
        var newTestValue = 3;
        tracker2.resultJson.testProperty = newTestValue;
        if (waitMillis) {
          tracker2.waitMillis = waitMillis;
        }
        if (idNotFoundException) {
          tracker2.idNotFoundException = idNotFoundException;
        }
        if (error) {
          tracker2.error = error;
        }
        var deferred = new doh.Deferred();
        var resultPromise = subject.retrieve(MockPo, id, tracker2);
        doh.t(resultPromise);
        resultPromise.then(
          function(pSuccess) {
            try {
              doh.t(pSuccess);
              doh.is(id, pSuccess.get("persistenceId"));
              doh.t(pSuccess.isInstanceOf(MockPo));
              doh.is(newTestValue, pSuccess.get("testProperty"));
              var ce = getCacheEntry(subject, p);
              doh.t(ce);
              doh.is(pSuccess, ce.payload);
              doh.is(1, ce.getNrOfReferers());
              doh.t(ce._referers.contains(tracker2));
              deferred.callback(true);
            }
            catch (error) {
              deferred.errback(error);
            }
          },
          function(problem) {
            try {
              if (error) {
                console.log("Expected error message: " + error);
              }
              else if (idNotFoundException) {
                doh.is(idNotFoundException, problem);
//                removedFromServer(subject, p, persistenceIdEvent, oldTestValue, testPropertyEvent, testPropertyEvent);
              }
              else {
                doh.fail();
              }
              deferred.callback(true);
            }
            catch (error) {
              deferred.errback(error);
            }
          }
        );
        return deferred;
      }

      doh.register("CrudDao (Mock)", [

        function testConstructor() {
          var subject = new CrudDaoMock();
          doh.invars(subject);
        },

        {
          name: "track1",
          setUp: subjectSetup,
          runTest: function() {
            var p = createMockPo();
            var tracker = {};
            this.subject.track(p, tracker);
            var ce = getCacheEntry(this.subject, p);
            doh.t(ce);
            doh.is(p, ce.payload);
            doh.is(1, ce.getNrOfReferers());
            doh.t(ce._referers.contains(tracker));
          }
        },

        {
          name: "track2",
          setUp: subjectSetup,
          runTest: function() {
            var p = createMockPo();
            var tracker = {};
            this.subject.track(p, tracker);
            this.subject.track(p, tracker);
            var ce = getCacheEntry(this.subject, p);
            doh.t(ce);
            doh.is(p, ce.payload);
            doh.is(1, ce.getNrOfReferers());
            doh.t(ce._referers.contains(tracker));
          }
        },

        {
          name: "track3",
          setUp: subjectSetup,
          runTest: function() {
            var p = createMockPo();
            var tracker1 = {};
            var tracker2 = 6;
            this.subject.track(p, tracker1);
            this.subject.track(p, tracker2);
            var ce = getCacheEntry(this.subject, p);
            doh.t(ce);
            doh.is(p, ce.payload);
            doh.is(2, ce.getNrOfReferers());
            doh.t(ce._referers.contains(tracker1));
            doh.t(ce._referers.contains(tracker2));
          }
        },

        {
          name: "stopTracking1",
          setUp: subjectSetup,
          runTest: function() {
            var p = createMockPo();
            var tracker1 = {};
            var tracker2 = 6;
            this.subject.track(p, tracker1);
            this.subject.track(p, tracker2);
            this.subject.stopTracking(p, tracker2);
            var ce = getCacheEntry(this.subject, p);
            doh.t(ce);
            doh.is(p, ce.payload);
            doh.is(1, ce.getNrOfReferers());
            doh.t(ce._referers.contains(tracker1));
          }
        },

        {
          name: "stopTracking2",
          setUp: subjectSetup,
          runTest: function() {
            var p = createMockPo();
            var tracker1 = {};
            var tracker2 = 6;
            this.subject.track(p, tracker1);
            this.subject.track(p, tracker2);
            this.subject.stopTracking(p, tracker2);
            var ce = getCacheEntry(this.subject, p);
            doh.t(ce);
            this.subject.stopTracking(p, tracker1);
            ce = getCacheEntry(this.subject, p);
            doh.f(ce);
          }
        },

        {
          name: "_noLongerInServer",
          setUp: subjectSetup,
          runTest: function() {
            var p = createMockPo();
            var tracker1 = {};
            var tracker2 = 6;
            this.subject.track(p, tracker1);
            this.subject.track(p, tracker2);
            var ce = getCacheEntry(this.subject, p);
            doh.t(ce);
            p._changeAttrValue("persistenceId", null);
            doh.is(null, p.persistenceId);
            ce = getCacheEntry(this.subject, p);
            doh.f(ce);
          }
        },

        {
          name: "create1",
          setUp: subjectSetup,
          runTest: function() {
            return testCreate(this.subject);
          }
        },

        {
          name: "create2",
          setUp: subjectSetup,
          runTest: function() {
            return testCreate(this.subject, 100);
          },
          timeout: 3000
        },

        {
          name: "create3",
          setUp: subjectSetup,
          runTest: function() {
            return testCreate(this.subject, 0, "SemanticException");
          }
        },

        {
          name: "create4",
          setUp: subjectSetup,
          runTest: function() {
            return testCreate(this.subject, 100, "SemanticException");
          },
          timeout: 3000
        },

        {
          name: "create5",
          setUp: subjectSetup,
          runTest: function() {
            return testCreate(this.subject, 0, null, "AN ERROR");
          }
        },

        {
          name: "create6",
          setUp: subjectSetup,
          runTest: function() {
            return testCreate(this.subject, 100, null, "AN ERROR");
          },
          timeout: 3000
        },

        {
          name: "update1",
          setUp: subjectSetup,
          runTest: function() {
            return testUpdate(this.subject);
          }
        },

        {
          name: "update2",
          setUp: subjectSetup,
          runTest: function() {
            return testUpdate(this.subject, 100);
          },
          timeout: 3000
        },

        {
          name: "update3",
          setUp: subjectSetup,
          runTest: function() {
            return testUpdate(this.subject, 0, "SemanticException");
          }
        },

        {
          name: "update4",
          setUp: subjectSetup,
          runTest: function() {
            return testUpdate(this.subject, 100, "SemanticException");
          },
          timeout: 3000
        },

        {
          name: "update5",
          setUp: subjectSetup,
          runTest: function() {
            return testUpdate(this.subject, 0, new IdNotFoundException());
          }
        },

        {
          name: "update6",
          setUp: subjectSetup,
          runTest: function() {
            return testUpdate(this.subject, 100, new IdNotFoundException());
          },
          timeout: 3000
        },

        {
          name: "update7",
          setUp: subjectSetup,
          runTest: function() {
            return testUpdate(this.subject, 0, null, "AN ERROR");
          }
        },

        {
          name: "update8",
          setUp: subjectSetup,
          runTest: function() {
            return testUpdate(this.subject, 100, null, "AN ERROR");
          },
          timeout: 3000
        },

        {
          name: "delete1",
          setUp: subjectSetup,
          runTest: function() {
            return testDelete(this.subject);
          }
        },

        {
          name: "delete2",
          setUp: subjectSetup,
          runTest: function() {
            return testDelete(this.subject, 100);
          },
          timeout: 3000
        },

        {
          name: "delete3",
          setUp: subjectSetup,
          runTest: function() {
            return testDelete(this.subject, 0, "SemanticException");
          }
        },

        {
          name: "delete4",
          setUp: subjectSetup,
          runTest: function() {
            return testDelete(this.subject, 100, "SemanticException");
          },
          timeout: 3000
        },

        {
          name: "delete5",
          setUp: subjectSetup,
          runTest: function() {
            return testDelete(this.subject, 0, null, "AN ERROR");
          }
        },

        {
          name: "delete6",
          setUp: subjectSetup,
          runTest: function() {
            return testDelete(this.subject, 100, null, "AN ERROR");
          },
          timeout: 3000
        },

        {
          name: "get-Cached-1",
          setUp: subjectSetup,
          runTest: function() {
            return testGetCached(this.subject);
          },
          timeout: 3000
        },

        {
          name: "get-Cached-2",
          setUp: subjectSetup,
          runTest: function() {
            return testGetCached(this.subject, 100);
          },
          timeout: 3000
        },

        {
          name: "get-Cached-3",
          setUp: subjectSetup,
          runTest: function() {
            return testGetCached(this.subject, 0, new IdNotFoundException());
          },
          timeout: 3000
        },

        {
          name: "get-Cached-4",
          setUp: subjectSetup,
          runTest: function() {
            return testGetCached(this.subject, 100, new IdNotFoundException());
          },
          timeout: 3000
        },

        {
          name: "get-Cached-5",
          setUp: subjectSetup,
          runTest: function() {
            return testGetCached(this.subject, 0, null, "AN ERROR");
          },
          timeout: 3000
        },

        {
          name: "get-Cached-6",
          setUp: subjectSetup,
          runTest: function() {
            return testGetCached(this.subject, 100, null, "AN ERROR");
          },
          timeout: 3000
        },

        {
          name: "get-NonCached-1",
          setUp: subjectSetup,
          runTest: function() {
            return testGetCached(this.subject);
          },
          timeout: 3000
        },

        {
          name: "get-NonCached-2",
          setUp: subjectSetup,
          runTest: function() {
            return testGetCached(this.subject, new IdNotFoundException());
          },
          timeout: 3000
        },

        {
          name: "get-NonCached-3",
          setUp: subjectSetup,
          runTest: function() {
            return testGetCached(this.subject, null, "AN ERROR");
          },
          timeout: 3000
        }

      ]);
    }
);
