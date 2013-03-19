define(["dojo/main", "ppwcode/contracts/doh", "../../persistence/polymorphAmdRevive",
        "dojo/promise/Promise"],
    function(dojo, doh, amdRevive,
             Promise) {

      function toType(obj) {
        // more than lang.isObject etc.
        /*
         http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/

         but with a better toString, and a final ;
         */
        /*
         toType({a: 4}); //"object"
         toType([1, 2, 3]); //"array"
         (function() {console.log(toType(arguments))})(); //arguments
         toType(new ReferenceError); //"error"
         toType(new Date); //"date"
         toType(/a-z/); //"regexp"
         toType(Math); //"math"
         toType(JSON); //"json"
         toType(new Number(4)); //"number"
         toType(new String("abc")); //"string"
         toType(new Boolean(true)); //"boolean"
         */

        return Object.prototype.toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();

        // TODO fails with null, I think
      }

      doh.register("ppwcode vernacular semantics amdRevive", [

        {
          name: "undefined",
          setUp: function() {
            this.parsedJson = undefined;
          },
          runTest: function() {
            var result = amdRevive(this.parsedJson);
            doh.is(undefined, result);
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
            var result = amdRevive(this.parsedJson);
            doh.is(null, result);
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
            var result = amdRevive(this.parsedJson);
            doh.is("string", toType(result));
            doh.is(this.parsedJson, result);
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
            var result = amdRevive(this.parsedJson);
            doh.is("string", toType(result));
            doh.is(this.parsedJson, result);
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
            var result = amdRevive(this.parsedJson);
            doh.is("number", toType(result));
            doh.is(this.parsedJson, result);
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
            var result = amdRevive(this.parsedJson);
            doh.is("number", toType(result));
            doh.is(this.parsedJson, result);
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
            var result = amdRevive(this.parsedJson);
            doh.is("number", toType(result));
            doh.is(this.parsedJson, result);
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
            var result = amdRevive(this.parsedJson);
            doh.is("boolean", toType(result));
            doh.is(this.parsedJson, result);
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
            var result = amdRevive(this.parsedJson);
            doh.is("boolean", toType(result));
            doh.is(this.parsedJson, result);
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
            var result = amdRevive(this.parsedJson);
            doh.is("json", toType(result));
            doh.is(this.parsedJson, result);
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
            var result = amdRevive(this.parsedJson);
            doh.is("math", toType(result));
            doh.is(this.parsedJson, result);
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
            var result = amdRevive(this.parsedJson);
            doh.is("error", toType(result));
            doh.is(this.parsedJson, result);
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
            var result = amdRevive(this.parsedJson);
            doh.is("date", toType(result));
            doh.is(this.parsedJson, result);
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
            var result = amdRevive(this.parsedJson);
            doh.is("regexp", toType(result));
            doh.is(this.parsedJson, result);
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
            var resultPromise = amdRevive(this.parsedJson);
            doh.is("object", toType(resultPromise)); // a Promise
            doh.t(resultPromise instanceof Promise);
            resultPromise.then(
              function(result) {
                try {
                  doh.is("array", toType(result));
                  doh.is(0, resultPromise.length);
                  deferred.callback(result);
                }
                catch(e) {
                  deferred.errback(e);
                }
              },
              function(err) {
                deferred.errback(err);
              }
            )
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
            var resultPromise = amdRevive(this.parsedJson);
            doh.is("object", toType(resultPromise)); // a Promise
            doh.t(resultPromise instanceof Promise);
            resultPromise.then(
              function(result) {
                try {
                  doh.is("object", toType(result));
                  doh.is(0, Object.keys(result));
                  deferred.callback(result);
                }
                catch(e) {
                  deferred.errback(e);
                }
              },
              function(err) {
                deferred.errback(err);
              }
            )
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        }

      ]);

    }
);
