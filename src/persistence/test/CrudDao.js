define(["dojo/main", "ppwcode/contracts/doh", "./CrudDaoMock", "../PersistentObject", "dojo/_base/declare"],
    function(dojo, doh, CrudDaoMock, PersistentObject, declare) {

      var baseUrl1 = "http://www.ppwcode.org/some/path/";

      subjectSetup = function() {
        var subject = new CrudDaoMock();
        subject.baseUrl = baseUrl1;
        this.subject = subject;
      };

      var MockPo = declare([PersistentObject], {

        constructor: function(kwargs) {
          this.test = 3;
        },

        test: 5

      });

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
        var result = subject.create(p, tracker1);
        doh.t(result);
        doh.t(result.persistentObject);
        doh.is(p, result.persistentObject);
        var resultPromise = result.promise;
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
              var ce = subject._getExistingCacheEntry(p);
              doh.t(subject._getExistingCacheEntry(p));
              doh.is(p, ce.persistentObject);
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
                doh.is(error, problem);
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

      doh.register("CrudDao (Mock)", [

        function testConstructor() {
          var subject = new CrudDaoMock();
        },

        {
          name: "base url 1",
          setUp: subjectSetup,
          runTest: function(){
            var result = this.subject.getUrl(PersistentObject, "777");
            console.log(result);
            doh.is(baseUrl1 + PersistentObject.prototype.declaredClass.replace(/\./g, "/") + "/777", result);
          }
        },

        {
          name: "base url 2",
          setUp: subjectSetup,
          runTest: function(){
            var result = this.subject.getUrl(PersistentObject);
            console.log(result);
            doh.is(baseUrl1 + PersistentObject.prototype.declaredClass.replace(/\./g, "/"), result);
          }
        },

        {
          name: "track1",
          setUp: subjectSetup,
          runTest: function() {
            var p = new MockPo({persistenceId: 777});
            var tracker = {};
            this.subject.track(p, tracker);
            var ce = this.subject._getExistingCacheEntry(p);
            doh.t(this.subject._getExistingCacheEntry(p));
            doh.is(p, ce.persistentObject);
            doh.is(1, ce.getNrOfReferers());
            doh.t(ce._referers.contains(tracker));
          }
        },

        {
          name: "track2",
          setUp: subjectSetup,
          runTest: function() {
            var p = new MockPo({persistenceId: 777});
            var tracker = {};
            this.subject.track(p, tracker);
            this.subject.track(p, tracker);
            var ce = this.subject._getExistingCacheEntry(p);
            doh.t(this.subject._getExistingCacheEntry(p));
            doh.is(p, ce.persistentObject);
            doh.is(1, ce.getNrOfReferers());
            doh.t(ce._referers.contains(tracker));
          }
        },

        {
          name: "track3",
          setUp: subjectSetup,
          runTest: function() {
            var p = new MockPo({persistenceId: 777});
            var tracker1 = {};
            var tracker2 = 6;
            this.subject.track(p, tracker1);
            this.subject.track(p, tracker2);
            var ce = this.subject._getExistingCacheEntry(p);
            doh.t(this.subject._getExistingCacheEntry(p));
            doh.is(p, ce.persistentObject);
            doh.is(2, ce.getNrOfReferers());
            doh.t(ce._referers.contains(tracker1));
            doh.t(ce._referers.contains(tracker2));
          }
        },

        {
          name: "stopTracking1",
          setUp: subjectSetup,
          runTest: function() {
            var p = new MockPo({persistenceId: 777});
            var tracker1 = {};
            var tracker2 = 6;
            this.subject.track(p, tracker1);
            this.subject.track(p, tracker2);
            this.subject.stopTracking(p, tracker2);
            var ce = this.subject._getExistingCacheEntry(p);
            doh.t(this.subject._getExistingCacheEntry(p));
            doh.is(p, ce.persistentObject);
            doh.is(1, ce.getNrOfReferers());
            doh.t(ce._referers.contains(tracker1));
          }
        },

        {
          name: "stopTracking2",
          setUp: subjectSetup,
          runTest: function() {
            var p = new MockPo({persistenceId: 777});
            var tracker1 = {};
            var tracker2 = 6;
            this.subject.track(p, tracker1);
            this.subject.track(p, tracker2);
            this.subject.stopTracking(p, tracker2);
            var ce = this.subject._getExistingCacheEntry(p);
            var key = ce.getKey();
            this.subject.stopTracking(p, tracker1);
            ce = this.subject._cache[key];
            doh.f(ce);
          }
        },

        {
          name: "_noLongerInServer",
          setUp: subjectSetup,
          runTest: function() {
            var p = new MockPo({persistenceId: 777});
            var tracker1 = {};
            var tracker2 = 6;
            this.subject.track(p, tracker1);
            this.subject.track(p, tracker2);
            var ce = this.subject._getExistingCacheEntry(p);
            var key = ce.getKey();
            this.subject._noLongerInServer(ce);
            ce = this.subject._cache[key];
            doh.f(ce);
            doh.is(null, p.persistenceId);
          }
        },

        {
          name: "create1",
          setUp: subjectSetup,
          runTest: function() {
            return testCreate(this.subject);
          }
        }

      ]);
    }
);
