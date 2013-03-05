define(["dojo/_base/declare",
        "ppwcode/contracts/_Mixin", "ppwcode/collections/StoreOfStateful",
        "dojo/_base/lang", "dojo/request", "dojo/Deferred", "dojo/store/QueryResults",
        "./PersistentObject"],
  function(declare,
           _ContractMixin, StoreOfStateful,
           lang, request, Deferred, QueryResults,
           PersistentObject) {

    var proxyNotReplacedError = new Error("ERROR: this is a LazyProxy definition. Its elements cannot be accessed. " +
      "It is intended to be replaced by a LazyProxy2 by a CrudDao, when the owning PersistentObject " +
      "passes through a CrudDao.");


    var LazyProxy = declare([_ContractMixin], {
      // summary:
      //   Lazy proxy for a ppwcode/collections/StoreOfStateful, that works together with
      //   an instance of ./CrudDao.
      // description:
      //   For lazy to-many properties, define an instance of this class in the prototype
      //   of a ./PersistentObject that has the to-many property. The name of the
      //   to-many property in server-lingo needs to be given in the constructor.
      //
      //   When an instance of PersistentObject is passed through a CrudDao,
      //   the CrudDao will detect the existence of an instance of this type,
      //   and replace it with an instance of LazyProxy2, that is coupled with its getToMany
      //   method. On any first access of an element inspector of that instance,
      //   the remote data will be loaded.
      //   Nothing happens on the second or later accesses.
      //   Users can call "reload" on the instance to force a reload from the server.
      //
      //   Accessing elements of instances of this class itself will result in an error.
      //   It means the instance of PersistentObject through which this object was retrieved
      //   was not passed through CrudDao.

      _c_invar: [
        function() { return this._c_prop_mandatory("serverPropertyName"); },
        function() { return this._c_prop_string("serverPropertyName"); }
      ],

      serverPropertyName: null,

      constructor: function(serverPropertyName) {
        this._c_pre(function() { return serverPropertyName && lang.isString(serverPropertyName); });

        this.serverPropertyName = serverPropertyName;
      },

      getIdentity: function(object){
        // summary:
        //		Returns an object's identity
        // object: Object
        //		The object to get the identity from
        // returns: String|Number

        this._c_pre(function() {return object && object.isInstanceOf && object.isInstanceOf(PersistentObject)});

        return object.get("persistenceType") && "@" && object.get("persistenceId");
      },

      get: function(id){
        // summary:
        //		Retrieves an object by its identity
        // id: Number
        //		The identity to use to lookup the object
        // returns: Object
        //		The object in the store that matches the given id.

        throw proxyNotReplacedError;
      },

      query: function(query, options){
        // summary:
        //		Queries the store for objects. This does not alter the store, but returns a
        //		set of data from the store.
        // query: String|Object|Function
        //		The query to use for retrieving objects from the store.
        // options: dojo/store/api/Store.QueryOptions
        //		The optional arguments to apply to the resultset.
        // returns: dojo/store/api/Store.QueryResults
        //		The results of the query, extended with iterative methods.
        //
        // example:
        //		Given the following store:
        //
        //	...find all items where "prime" is true:
        //
        //	|	store.query({ prime: true }).forEach(function(object){
        //	|		// handle each object
        //	|	});

        throw proxyNotReplacedError;
      }

    });

    var LazyProxy2 = declare([StoreOfStateful], {
      // summary:
      //   Lazy proxy for a ppwcode/collections/StoreOfStateful, that works together with
      //   an instance of ./CrudDao.
      // description:
      //   For lazy to-many properties, define an instance of this class in the prototype
      //   of a ./PersistentObject that has the to-many property. The name of the
      //   to-many property in server-lingo needs to be given in the constructor.
      //
      //   When an instance of PersistentObject is passed through a CrudDao,
      //   the CrudDao will detect the existence of an instance of this type,
      //   and replace it with an instance of LazyProxy2, that is coupled with its getToMany
      //   method. On any first access of an element inspector of that instance,
      //   the remote data will be loaded.
      //   Nothing happens on the second or later accesses.
      //   Users can call "reload" on the instance to force a reload from the server.
      //
      //   Accessing elements of instances of this class itself will result in an error.
      //   It means the instance of PersistentObject through which this object was retrieved
      //   was not passed through CrudDao.

      _c_invar: [
        function() { return this._c_prop_mandatory("definition"); },
        function() { return this.definition.isInstanceOf && this.definition.isInstanceOf(LazyProxy); },
        function() { return this._c_prop_mandatory("retrieveToMany"); },
        function() { return this._c_prop_function("retrieveToMany"); }
      ],

      constructor: function(/*LazyProxy*/ definition, /*Function*/ retrieveToMany) {
        this._c_pre(function() { return definition; });
        this._c_pre(function() { return definition; });

        this.serverPropertyName = definition.serverPropertyName;
      },

      getIdentity: LazyProxy.prototype.getIdentity,
        // summary:
        //		Returns an object's identity
        // object: Object
        //		The object to get the identity from
        // returns: String|Number

      get: function(id){
        // summary:
        //		Retrieves an object by its identity
        // id: Number
        //		The identity to use to lookup the object
        // returns: Object
        //		The object in the store that matches the given id.

        if (!this.loaded) {
          this.loaded = this.refreshFromServer(); // store in this, for when somebody asks again during load
          return this.loaded.then(
            function() {
              this.loaded == true;
              return this.inherited(arguments);
            },
            function(e) {
              return e;
            }
          );
        }
        else if (this.loaded !== true) {
          // it is a promise; we are already loading
          return this.loaded.then(
            function() {
              return this.inherited(arguments);
            },
            function(e) {
              return e;
            }
          );
        }
        else {
          // we are loaded, and it completed long ago
          // just use the store
          return this.inherited(arguments);
        }
      },

      query: function(query, options){
        // summary:
        //		Queries the store for objects. This does not alter the store, but returns a
        //		set of data from the store.
        // query: String|Object|Function
        //		The query to use for retrieving objects from the store.
        // options: dojo/store/api/Store.QueryOptions
        //		The optional arguments to apply to the resultset.
        // returns: dojo/store/api/Store.QueryResults
        //		The results of the query, extended with iterative methods.
        //
        // example:
        //		Given the following store:
        //
        //	...find all items where "prime" is true:
        //
        //	|	store.query({ prime: true }).forEach(function(object){
        //	|		// handle each object
        //	|	});

        if (!this.loaded) {
          this.loaded = this.refreshFromServer(); // store in this, for when somebody asks again during load
          return QueryResults(
            this.loaded.then(
              function() {
                this.loaded == true;
                return this.queryEngine(query, options);
              },
              function(e) {
                return e;
              }
            )
          );
        }
        else if (this.loaded !== true) {
          // it is a promise; we are already loading
          return QueryResults(
            this.loaded.then(
              function() {
                return this.queryEngine(query, options);
              },
              function(e) {
                return e;
              }
            )
          );
        }
        else {
          // we are loaded, and it completed long ago
          // just use the store
          return this.inherited(arguments);
        }
      },

      put: function(object, directives){
        console.warn("It makes no sense to call put on a LazyProxy.");
        return this.inherited(arguments);
      },

      add: function(object, directives){
        console.warn("It makes no sense to call add on a LazyProxy.");
        return this.inherited(arguments);
      },

      remove: function(id) {
        console.warn("It makes no sense to call remove on a LazyProxy.");
        return this.inherited(arguments);
      }

    });

    var lazyStore = {
      LazyProxy: LazyProxy,
      LazyProxy2: LazyProxy2
    };

    return lazyStore;
  }
);
