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

define(["dojo/_base/declare", "ppwcode/contracts/_Mixin",
        "./LazyToManyDefinition", "./PersistentObject",
        "./PersistentObjectStore", "dojo/store/Observable",
        "./CrudDao"],
  function(declare, _ContractsMixin,
           LazyToManyDefinition, PersistentObject,
           PersistentObjectStore, Observable,
           CrudDao) {

    var LazyToManyStore = declare([_ContractsMixin], {
      // summary:
      //   A store that lazy-loads the objects of a to-many relationship of a
      //   PersistentObject.
      //   It is normally created when the owner-object is created by `polymorphAmdRevive`.
      //   The store is read-only. On first access of a read-method, or when reload is called,
      //   it uses a CrudDao to get the many objects from the server.
      //   This is a dojo/store/Observable, in as far as that `query()` results can be
      //   `observe`d. `notify` is private.

      _c_invar: [
        function() {return this._c_prop_mandatory("owner");},
        function() {return this.owner.isInstanceOf && this.owner.isInstanceOf(PersistentObject);},
        function() {return this._c_prop_mandatory("definition");},
        function() {return this.definition.isInstanceOf && this.definition.isInstanceOf(LazyToManyDefinition);},
        function() {return this._c_prop_mandatory("crudDao");},
        function() {return this.crudDao.isInstanceOf && this.crudDao.isInstanceOf(CrudDao);}
      ],

      // owner: PersistentObject
      //   The PeristentObject that is the one in the one-to-many.
      // tags:
      //   readonly
      owner: null,

      // definition: LazyToManyDefinition
      //   Reference to the definition in the prototype of this object that defines
      //   the to-many association this object instantiates.
      // tags:
      //   readonly
      definition: null,

      // crudDao: CrudDao
      //   This instance will take care of getting the objects from the server.
      crudDao: null,

      constructor: function(/*PersistentObject*/ owner, /*LazyToManyDefinition*/ definition, /*CrudDao*/ crudDao) {
        this._c_pre(function() {return owner && owner.isInstanceOf && owner.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return definition && definition.isInstanceOf && definition.isInstanceOf(LazyToManyDefinition);});
        this._c_pre(function() {return crudDao && crudDao.isInstanceOf && crudDao.isInstanceOf(CrudDao);});

        this.owner = owner;
        this.definition = definition;
        this.crudDao = crudDao;
      },

      // _store: Observable(PersistentObjectStore)
      //   The store is created lazily when the objects are first loaded.
      //   That is how we know we have initialized.
      // tags:
      //   private
      _store: null,

      isInitialized: function() {
        return this._store !== null; // don't expose the store by accident
      },

      _initStore: function () {
        this._store = Observable(new PersistentObjectStore());
      },

      isLoading: function() {
        return this._reloadPromise !== null; // don't expose the store by accident
      },

      // _reloadPromise: Promise
      //   While we are loading, the promise is cached here. Parallel calls will not
      //   start a new load, but use this Promise too.
      _reloadPromise: null,

      _reload: function() {
        // summary:
        //   If this is the first time, we init the _store.
        //   We request the correct data from the server, and update the store with the result.
        //   We return a promise that resolves to the store when it is reloaded.
        //   If this function is called while we are already reloading, we return
        //   the promise for the ongoing request, and we don't start a new one.
        this._c_pre(function() {return this.crudDao.isOperational();});
        this._c_pre(function() {return this._store;});

        var self = this;
        if (self.isLoading()) {
          console.log("Requested GET of to many: " + self.owner + "['" + self.definition.serverPropertyName + "'], but already loading");
          return self._reloadPromise;
        }

        console.log("Requested GET of to many: " + self.owner + "['" + self.definition.serverPropertyName + "']");
        // IDEA: we can even add a query here
        var refreshPromise = self.crudDao.retrieveToMany(self._store, self.owner, self.definition.serverPropertyName);
        self._reloadPromise = refreshPromise.then(
          function(store) {
            self._reloadPromise = null;
            return store;
          }
        );
        return self._reloadPromise; // return Promise
      },

      get: function(id) {
        // summary:
        //   When this is the first time we access the data of the store,
        //   we get it for the first time from the server, and return a Promise
        //   for the requested element.
        //   Otherwise, even if we are reloading at this time, we return
        //   the element with the given id, if we find it.

        if (!this.isInitialized()) { // this is the first time
          this._initStore();
          var getPromise = this._reload().then(function(store) {
            return store.get(id);
          });
          return getPromise; // return Promise
        }
        else { // we already have data (even thought we might be reloading in the mean time)
          return this._store.get(id);
        }
      },

      query: function(query, options) {
        // summary:
        //   When this is the first time we access the data of the store,
        //   we get it for the first time from the server. When we get the data,
        //   we pass it the query.
        //   Otherwise, even if we are reloading at this time, we return
        //   the QueryResult on the current data.
        // description:
        //   When this is the first time we access the data of the store,
        //   the QueryResult is ASYNC!~!!

        if (!this.isInitialized()) { // this is the first time
          this._initStore();
          var result = this._store.query(query, options); // empty for now, but just wait a while
          // IDEA it would be nicer to return the QueryResults around the promise of an array,
          //      but that could not be an Observable QueryResults of the store.
          var reloadPromise = this._reload();
          // reloadPromise.then(function() {  // will trigger events from the query
          //   return result;
          // });
          return result; // return QueryResults; somehow includes the Promise aspect already
          // spec doesn't allow us to return the Promise of a QueryResults
        }
        else {
          return this._store.query(query, options); // return QueryResults
        }
      },

      reload: function() {
        // summary:
        //   Reload the to-many association from the server, or load the objects for the first time.
        // description:
        //   Returns a Promise, that resolves to this when ready.

        var self = this;
        if (!this.isInitialized()) {
          this._initStore();
        }
        var selfPromise = self._reload().then(function() { // we don't use the store argument (private)
          return self;
        });
        return selfPromise; // return Promise
      }

    });

    return LazyToManyStore; // return LazyToManyStore
  }
);
