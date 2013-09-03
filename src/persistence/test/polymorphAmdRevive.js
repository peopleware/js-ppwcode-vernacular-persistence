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
        "../polymorphAmdRevive",
        "../CrudDao",
        "ppwcode-util-oddsAndEnds/typeOf", "dojo/promise/Promise", "dojo/Deferred",
        "require"],
  // NOTE: don't require Person; this will ruin the test (reviver must find it itself)


    function(doh,
             revive,
             CrudDao,
             typeOf, Promise, Deferred,
             require) {

      var referer = {};
      var serverType2Constructor = function(serverType) {
        var deferred = new Deferred();
        var mid = "./mock/" + serverType;
        var requireErrorHandle = require.on("error", function (err) {
          requireErrorHandle.remove(); // handler did its work
          deferred.reject(err); // this turns out to be a different structure than documented, but whatever
        });
        require([mid], function (Constructor) {
          try {
            requireErrorHandle.remove(); // require worked successfully
            deferred.resolve(Constructor);
          }
          catch (err) {
            deferred.reject(err);
          }
        });
        return deferred.promise;
      };
      var crudDao = new CrudDao();
      crudDao.revive = function(data, referer, crudDao) {
        return revive(data, referer, serverType2Constructor, crudDao);
      };
//      crudDao.urlBuilder = ???; not needed for test

      doh.register("ppwcode vernacular semantics revive", [

        {
          name: "undefined",
          setUp: function() {
            this.parsedJson = undefined;
          },
          runTest: function() {
            var result = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is(undefined, result);
            console.log(crudDao._cache.report());
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "null",
          setUp: function() {
            this.parsedJson = null;
          },
          runTest: function() {
            var result = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is(null, result);
            console.log(crudDao._cache.report());
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "real string",
          setUp: function() {
            this.parsedJson = "This is a string";
          },
          runTest: function() {
            var result = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("string", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(crudDao._cache.report());
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "empty string",
          setUp: function() {
            this.parsedJson = "";
          },
          runTest: function() {
            var result = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("string", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(crudDao._cache.report());
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "number (pos int)",
          setUp: function() {
            this.parsedJson = 5;
          },
          runTest: function() {
            var result = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("number", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(crudDao._cache.report());
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "number (0)",
          setUp: function() {
            this.parsedJson = 0;
          },
          runTest: function() {
            var result = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("number", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(crudDao._cache.report());
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "number (neg decimal)",
          setUp: function() {
            this.parsedJson = -5.4;
          },
          runTest: function() {
            var result = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("number", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(crudDao._cache.report());
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "boolean (true)",
          setUp: function() {
            this.parsedJson = true;
          },
          runTest: function() {
            var result = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("boolean", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(crudDao._cache.report());
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "boolean (false)",
          setUp: function() {
            this.parsedJson = false;
          },
          runTest: function() {
            var result = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("boolean", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(crudDao._cache.report());
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "JSON",
          setUp: function() {
            this.parsedJson = JSON;
          },
          runTest: function() {
            var result = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("json", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(crudDao._cache.report());
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "Math",
          setUp: function() {
            this.parsedJson = Math;
          },
          runTest: function() {
            var result = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("math", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(crudDao._cache.report());
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "ReferenceError",
          setUp: function() {
            this.parsedJson = new ReferenceError();
          },
          runTest: function() {
            var result = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("error", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(crudDao._cache.report());
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "Date",
          setUp: function() {
            this.parsedJson = new Date();
          },
          runTest: function() {
            var result = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("date", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(crudDao._cache.report());
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "RegEx",
          setUp: function() {
            this.parsedJson = /abc/g;
          },
          runTest: function() {
            var result = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("regexp", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(crudDao._cache.report());
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "Array (empty)",
          setUp: function() {
            this.parsedJson = [];
          },
          runTest: function() {
            var deferred = new doh.Deferred();
            var resultPromise = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("object", typeOf(resultPromise)); // a Promise
            doh.t(resultPromise instanceof Promise);
            resultPromise.then(
              function(result) {
                try {
                  doh.is("array", typeOf(result));
                  doh.is(0, result.length);
                  console.log(crudDao._cache.report());
                  deferred.callback(result);
                }
                catch(e) {
                  deferred.errback(e);
                }
              },
              function(err) {
                deferred.errback(err);
              }
            );
            return deferred;
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "Array (mixed content)",
          setUp: function() {
            this.parsedJson = [1, "a", Math, JSON, { name: "a NAme"}, [], null, undefined, [4, 6, 88, "a", [24, { another: "ANother"}]]];
          },
          runTest: function() {
            var deferred = new doh.Deferred();
            var parsedJson = this.parsedJson;
            var resultPromise = revive(parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("object", typeOf(resultPromise)); // a Promise
            doh.t(resultPromise instanceof Promise);
            resultPromise.then(
              function(result) {
                try {
                  doh.is("array", typeOf(result));
                  doh.is(9, result.length);
                  doh.is(parsedJson, result);
                  doh.f(parsedJson === result);
                  doh.f(parsedJson[4] === result[4]);
                  doh.f(parsedJson[8] === result[8]);
                  doh.f(parsedJson[8][4] === result[8][4]);
                  doh.f(parsedJson[8][4][1] === result[8][4][1]);
                  console.log(crudDao._cache.report());
                  deferred.callback(result);
                }
                catch(e) {
                  deferred.errback(e);
                }
              },
              function(err) {
                deferred.errback(err);
              }
            );
            return deferred;
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "Object (empty)",
          setUp: function() {
            this.parsedJson = {};
          },
          runTest: function() {
            var deferred = new doh.Deferred();
            var resultPromise = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("object", typeOf(resultPromise)); // a Promise
            doh.t(resultPromise instanceof Promise);
            resultPromise.then(
              function(result) {
                try {
                  doh.is("object", typeOf(result));
                  doh.is(0, Object.keys(result));
                  console.log(crudDao._cache.report());
                  deferred.callback(result);
                }
                catch(e) {
                  deferred.errback(e);
                }
              },
              function(err) {
                deferred.errback(err);
              }
            );
            return deferred;
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "Object (complex)",
          setUp: function() {
            this.parsedJson = {
              propa: "a",
              prop1: 1,
              propMath: Math,
              arrayPropEmpty: [],
              arrayProp: [1, "a", Math, JSON, { name: "a NAme"}, [], null, undefined, [4, 6, 88, "a", [24, { another: "ANother"}]]],
              nestedObject: {},
              nestedObject2: {
                pA: "A",
                p2: 2,
                pDate: new Date(),
                nestedObject: {
                  nestedAlpha: "alpha",
                  arrayProp: [1, "a", Math, JSON, { name: "a NAme"}, [], null, undefined, [4, 6, 88, "a", [24, { another: "ANother"}]]]
                }
              }
            };
          },
          runTest: function() {
            var deferred = new doh.Deferred();
            var parsedJson = this.parsedJson;
            var resultPromise = revive(parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("object", typeOf(resultPromise)); // a Promise
            doh.t(resultPromise instanceof Promise);
            resultPromise.then(
              function(result) {
                try {
                  doh.is("object", typeOf(result));
                  doh.is(7, Object.keys(result).length);
                  doh.is(parsedJson, result);
                  doh.f(parsedJson === result);
                  doh.f(parsedJson.arrayProp === result.arrayProp);
                  doh.f(parsedJson.nestedObject2 === result.nestedObject2);
                  doh.f(parsedJson.nestedObject2.pDate === result.nestedObject2.pDate);
                  doh.f(parsedJson.nestedObject2.nestedObject === result.nestedObject2.nestedObject);
                  doh.f(parsedJson.nestedObject2.nestedObject.arrayProp === result.nestedObject2.nestedObject.arrayProp);
                  console.log(crudDao._cache.report());
                  deferred.callback(result);
                }
                catch(e) {
                  deferred.errback(e);
                }
              },
              function(err) {
                deferred.errback(err);
              }
            );
            return deferred;
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "AMD (Person)",
          setUp: function() {
            this.parsedJson = {
              "$type": "Person",
              "persistenceId": 7,
              "name":"Pete Peeters",
              "street":"Avenue de rue 93",
              "zip":"1040 CAA",
              "city":"Cité de Beauté",
              "tel":"0322 44 442 22"
            };
          },
          runTest: function() {
            var deferred = new doh.Deferred();
            var resultPromise = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("object", typeOf(resultPromise)); // a Promise
            doh.t(resultPromise instanceof Promise);
            resultPromise.then(
              function(result) {
                try {
                  doh.is("object", typeOf(result));
                  doh.t(result.isInstanceOf && Object.getPrototypeOf(result).getTypeDescription() === "PERSON");
                  doh.is(7, result.get("persistenceId"));
                  console.log(crudDao._cache.report());
                  deferred.callback(result);
                }
                catch(e) {
                  deferred.errback(e);
                }
              },
              function(err) {
                deferred.errback(err);
              }
            );
            return deferred;
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "AMD (Array of Person)",
          setUp: function() {
            this.parsedJson = [
              {
                "$type": "Person",
                "persistenceId": 7,
                "name":"Pete Peeters",
                "street":"Avenue de rue 93",
                "zip":"1040 CAA",
                "city":"Cité de Beauté",
                "tel":"0322 44 442 22"
              },
              {
                "$type": "Person",
                "persistenceId": 9,
                "name":"Pete Peeters 2",
                "street":"Avenue de rue 93",
                "zip":"1040 CAA",
                "city":"Cité de Beauté",
                "tel":"0322 44 442 22"
              },
              {
                "$type": "Person",
                "persistenceId": 7,
                "name":"Pete Peeters EEN ANDERE MET ZELFDE PK",
                "street":"Avenue de rue 93",
                "zip":"1040 CAA",
                "city":"Cité de Beauté",
                "tel":"0322 44 442 22"
              },
              {
                "$type": "Person",
                "persistenceId": 10,
                "name":"Pete Peeters 10",
                "street":"Avenue de rue 93",
                "zip":"1040 CAA",
                "city":"Cité de Beauté",
                "tel":"0322 44 442 22"
              },
              {
                "$type": "Person",
                "persistenceId": null,
                "name":"Pete Peeters DELETED",
                "street":"Avenue de rue 93",
                "zip":"1040 CAA",
                "city":"Cité de Beauté",
                "tel":"0322 44 442 22"
              }];
          },
          runTest: function() {
            var deferred = new doh.Deferred();
            var resultPromise = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("object", typeOf(resultPromise)); // a Promise
            doh.t(resultPromise instanceof Promise);
            var parsedJson = this.parsedJson;
            resultPromise.then(
              function(result) {
                try {
                  doh.is("array", typeOf(result));
                  doh.is(5, result.length);
                  doh.t(result[0] === result[2]);
                  doh.f(result[0] === result[1]);
                  doh.f(result[0] === result[3]);
                  console.log(crudDao._cache.report());
                  deferred.callback(result);
                }
                catch(e) {
                  deferred.errback(e);
                }
              },
              function(err) {
                deferred.errback(err);
              }
            );
            return deferred;
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        },

        {
          name: "AMD (Array of Children with 2 parents)",
          setUp: function() {
            this.parsedJson = [
              {
                "$type": "Child",
                "persistenceId": 7,
                "name":"Kind1A",
                "street":"Avenue de rue 93",
                "zip":"1040 CAA",
                "city":"Cité de Beauté",
                "tel":"0322 44 442 22",
                parent: {
                  "$type": "Person",
                  "persistenceId": 123,
                  "name":"Parent1",
                  "street":"Avenue de rue 93",
                  "zip":"1040 CAA",
                  "city":"Cité de Beauté",
                  "tel":"0322 44 442 22"
                }
              },
              {
                "$type": "Child",
                "persistenceId": 101,
                "name":"Kind1B",
                "street":"Avenue de rue 93",
                "zip":"1040 CAA",
                "city":"Cité de Beauté",
                "tel":"0322 44 442 22",
                parent: {
                  "$type": "Person",
                  "persistenceId": 456,
                  "name":"Parent2",
                  "street":"Avenue de rue 93",
                  "zip":"1040 CAA",
                  "city":"Cité de Beauté",
                  "tel":"0322 44 442 22"
                }
              },
              {
                "$type": "Child",
                "persistenceId": 102,
                "name":"Kind2A",
                "street":"Avenue de rue 93",
                "zip":"1040 CAA",
                "city":"Cité de Beauté",
                "tel":"0322 44 442 22",
                parent: {
                  "$type": "Person",
                  "persistenceId": 123,
                  "name":"Parent1",
                  "street":"Avenue de rue 93",
                  "zip":"1040 CAA",
                  "city":"Cité de Beauté",
                  "tel":"0322 44 442 22"
                }
              },
              {
                "$type": "Child",
                "persistenceId": 777,
                "name":"Kind2B",
                "street":"Avenue de rue 93",
                "zip":"1040 CAA",
                "city":"Cité de Beauté",
                "tel":"0322 44 442 22",
                parent: {
                  "$type": "Person",
                  "persistenceId": 456,
                  "name":"Parent2",
                  "street":"Avenue de rue 93",
                  "zip":"1040 CAA",
                  "city":"Cité de Beauté",
                  "tel":"0322 44 442 22"
                }
              }];
          },
          runTest: function() {
            var deferred = new doh.Deferred();
            var resultPromise = revive(this.parsedJson, referer, serverType2Constructor, crudDao);
            doh.is("object", typeOf(resultPromise)); // a Promise
            doh.t(resultPromise instanceof Promise);
            var parsedJson = this.parsedJson;
            resultPromise.then(
              function(result) {
                try {
                  doh.is("array", typeOf(result));
                  doh.is(4, result.length);
                  doh.t(result[0].parent === result[2].parent);
                  doh.t(result[1].parent === result[3].parent);
                  doh.f(result[0].parent === result[1].parent);
                  doh.f(result[2].parent === result[3].parent);
                  console.log(crudDao._cache.report());
                  deferred.callback(result);
                }
                catch(e) {
                  deferred.errback(e);
                }
              },
              function(err) {
                deferred.errback(err);
              }
            );
            return deferred;
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        }

      ]);

    }
);
