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

define(["dojo/main", "ppwcode/contracts/doh",
        "../LazyToManyStore",
        "../LazyToManyDefinition",
        "./mock/Person", "../PersistentObject",
        "./mock/CrudDao1"],
  function(dojo, doh,
           LazyToManyStore,
           LazyToManyDefinition,
           Person, PersistentObject,
           CrudDaoMock) {

    var aServerPropertyName = "A SERVER PROPERTY NAME";
    var aLazyPropertyDefinition = new LazyToManyDefinition(aServerPropertyName);
    var personId1 = 898942;
    var personJson = {
      "persistenceId": personId1,
      "name":"Pete Peeters",
      "street":"Avenue de rue 93",
      "zip":"1040 CAA",
      "city":"Cité de Beauté",
      "tel":"0322 44 442 22"
    };
    var person = new Person();
    person.reload(personJson);
    var crudDao = new CrudDaoMock();

    doh.register("LazyToManyStore", [

      function testConstructor() {
        var subject = new LazyToManyStore(person, aLazyPropertyDefinition, crudDao);
        doh.invars(subject);
        // post
        doh.is(person, subject.owner);
        doh.is(aLazyPropertyDefinition, subject.definition);
        doh.is(crudDao, subject.crudDao);
        doh.f(subject.isInitialized());
        doh.f(subject.isLoading());
      },

      function testGet1() {
        var subject = new LazyToManyStore(person, aLazyPropertyDefinition, crudDao);
        var deferred = new doh.Deferred();
        var resultPromise = subject.get(5);
        doh.invars(subject);
        // post
        doh.is(person, subject.owner);
        doh.is(aLazyPropertyDefinition, subject.definition);
        doh.is(crudDao, subject.crudDao);
        doh.t(subject.isInitialized());
        resultPromise.then(
          function(person) {
            try {
              doh.f(person);
              doh.f(subject.isLoading());
              deferred.callback(person);
            }
            catch(e) {
              deferred.errback(e);
            }
          },
          function(e) {
            deferred.errback(e);
          }
        );
        return deferred;
      },

      function testGet2() {
        var subject = new LazyToManyStore(person, aLazyPropertyDefinition, crudDao);
        var deferred = new doh.Deferred();
        var resultPromise = subject.get(PersistentObject.keyForId("PERSON", 9872));
        doh.invars(subject);
        // post
        doh.is(person, subject.owner);
        doh.is(aLazyPropertyDefinition, subject.definition);
        doh.is(crudDao, subject.crudDao);
        doh.t(subject.isInitialized());
        resultPromise.then(
          function(person) {
            try {
              doh.t(person);
              doh.f(subject.isLoading());
              deferred.callback(person);
            }
            catch(e) {
              deferred.errback(e);
            }
          },
          function(e) {
            deferred.errback(e);
          }
        );
        return deferred;
      },

      function testQuery() {
        var subject = new LazyToManyStore(person, aLazyPropertyDefinition, crudDao);
        var deferred = new doh.Deferred();
        var queryResult = subject.query({name: "Mieke Maaike"});
        queryResult.observe(function(object, previousIndex, newIndex) {
          doh.t(subject.isLoading());
          // !!!! we are still "loading" !!!!
          // The reason is we only get control back in LazyToManyStore after the CrudDao has changed the Store, which sends events
          doh.t(previousIndex < 0);
          doh.t(newIndex >= 0);
          doh.t(object);
          doh.is("Mieke Maaike", object.name);
          deferred.callback(person);
        });
        doh.invars(subject);
        // post
        doh.is(person, subject.owner);
        doh.is(aLazyPropertyDefinition, subject.definition);
        doh.is(crudDao, subject.crudDao);
        doh.t(subject.isInitialized());
        return deferred;
      },

      function testReload() {
        var subject = new LazyToManyStore(person, aLazyPropertyDefinition, crudDao);
        var deferred = new doh.Deferred();
        var resultPromise = subject.reload();
        doh.invars(subject);
        // post
        doh.is(person, subject.owner);
        doh.is(aLazyPropertyDefinition, subject.definition);
        doh.is(crudDao, subject.crudDao);
        doh.t(subject.isInitialized());
        resultPromise.then(
          function(ltms) {
            try {
              doh.t(ltms);
              doh.is(subject, ltms);
              doh.f(subject.isLoading());
              deferred.callback(person);
            }
            catch(e) {
              deferred.errback(e);
            }
          },
          function(e) {
            deferred.errback(e);
          }
        );
        return deferred;
      }

    ]);

  }
);
