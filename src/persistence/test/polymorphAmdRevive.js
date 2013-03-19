define(["dojo/main", "ppwcode/contracts/doh",
        "../polymorphAmdRevive",
        "../_Cache2",
        "ppwcode/oddsAndEnds/typeOf", "dojo/promise/Promise"],
    function(dojo, doh,
             revive,
             _Cache,
             typeOf, Promise) {

      var referer = {};
      var serverType2Mid = function(serverType) {
        return "ppwcode/persistence/test/mock/" + serverType;
      };
      var cache = new _Cache();

      doh.register("ppwcode vernacular semantics revive", [

        {
          name: "undefined",
          setUp: function() {
            this.parsedJson = undefined;
          },
          runTest: function() {
            var result = revive(this.parsedJson, referer, serverType2Mid, cache);
            doh.is(undefined, result);
            console.log(cache.report());
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
            var result = revive(this.parsedJson, referer, serverType2Mid, cache);
            doh.is(null, result);
            console.log(cache.report());
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
            var result = revive(this.parsedJson, referer, serverType2Mid, cache);
            doh.is("string", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(cache.report());
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
            var result = revive(this.parsedJson, referer, serverType2Mid, cache);
            doh.is("string", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(cache.report());
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
            var result = revive(this.parsedJson, referer, serverType2Mid, cache);
            doh.is("number", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(cache.report());
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
            var result = revive(this.parsedJson, referer, serverType2Mid, cache);
            doh.is("number", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(cache.report());
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
            var result = revive(this.parsedJson, referer, serverType2Mid, cache);
            doh.is("number", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(cache.report());
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
            var result = revive(this.parsedJson, referer, serverType2Mid, cache);
            doh.is("boolean", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(cache.report());
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
            var result = revive(this.parsedJson, referer, serverType2Mid, cache);
            doh.is("boolean", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(cache.report());
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
            var result = revive(this.parsedJson, referer, serverType2Mid, cache);
            doh.is("json", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(cache.report());
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
            var result = revive(this.parsedJson, referer, serverType2Mid, cache);
            doh.is("math", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(cache.report());
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
            var result = revive(this.parsedJson, referer, serverType2Mid, cache);
            doh.is("error", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(cache.report());
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
            var result = revive(this.parsedJson, referer, serverType2Mid, cache);
            doh.is("date", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(cache.report());
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
            var result = revive(this.parsedJson, referer, serverType2Mid, cache);
            doh.is("regexp", typeOf(result));
            doh.is(this.parsedJson, result);
            console.log(cache.report());
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
            var resultPromise = revive(this.parsedJson, referer, serverType2Mid, cache);
            doh.is("object", typeOf(resultPromise)); // a Promise
            doh.t(resultPromise instanceof Promise);
            resultPromise.then(
              function(result) {
                try {
                  doh.is("array", typeOf(result));
                  doh.is(0, result.length);
                  console.log(cache.report());
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
            var resultPromise = revive(parsedJson, referer, serverType2Mid, cache);
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
                  console.log(cache.report());
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
            var resultPromise = revive(this.parsedJson, referer, serverType2Mid, cache);
            doh.is("object", typeOf(resultPromise)); // a Promise
            doh.t(resultPromise instanceof Promise);
            resultPromise.then(
              function(result) {
                try {
                  doh.is("object", typeOf(result));
                  doh.is(0, Object.keys(result));
                  console.log(cache.report());
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
            return deferred;
          },
          tearDown: function() {
            this.parsedJson = null;
          }
        }

      ]);

    }
);
