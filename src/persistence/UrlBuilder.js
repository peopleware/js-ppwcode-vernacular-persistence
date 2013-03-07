define(["dojo/_base/declare", "ppwcode/oddsAndEnds/typeOf"],
    function(declare, typeOf) {

      var UrlBuilder = declare([], {
        // summary:
        //   An interface for which you have to provide an implementation.
        //   Instances, when operational, return url's for CRUD functions,
        //   for specific objects.
        //   How they do it, is up to the implementation.

        _c_invar: [
        ],

        get: function(/*String*/ method) {
          this._c_pre(function() {return typeOf(method) === "string";});

          switch (method) {
            case "GET":
              return this.retrieve;
            case "POST":
              return this.create;
            case "PUT":
              return this.update;
            case "DELETE":
              return this.delete;
            default:
              throw new Error("Unknown method: " + method);
          }
        },

        search: function(/*String?*/ serverType, /*Object?*/ query) {
          // summary:
          //   Returns a URL to search for objects.
          // description:
          //   A search for a specific `serverType` with or without a `query` should
          //   return objects of that type.
          //   A search for a specific `serverType` without a `query` should return all
          //   objects of that type.
          //   The semantics of a search without a specific `serverType`, with
          //   or without a `query`, is open.
          //   The semantics of the `query`, is open.
          this._c_pre(function() {return !serverType || typeOf(serverType) === "string";});
          this._c_pre(function() {return !query || typeOf(query) === "object";});

          this._c_ABSTRACT();
        },

        toMany: function(serverType, id, serverPropertyName) {
          // summary:
          //   Returns a URL to retrieve all objects of a to-many property of an object.
          this._c_pre(function() {return typeOf(serverType) === "string";});
          this._c_pre(function() {return typeOf(id) === "number";});
          this._c_pre(function() {return typeOf(serverPropertyName) === "string";});

          this._c_ABSTRACT();
        },

        retrieve: function(serverType, id) {
          // summary:
          //   Returns a URL to retrieve an object of the given `serverType` with the given id.
          this._c_pre(function() {return typeOf(serverType) === "string";});
          this._c_pre(function() {return typeOf(id) === "number";});

          this._c_ABSTRACT();
        },

        create: function(serverType) {
          // summary:
          //   Returns a URL to create an object of the given `serverType`.
          this._c_pre(function() {return typeOf(serverType) === "string";});

          this._c_ABSTRACT();
        },

        update: function(serverType, id) {
          // summary:
          //   Returns a URL to update an object of the given `serverType`.
          this._c_pre(function() {return typeOf(serverType) === "string";});
          this._c_pre(function() {return typeOf(id) === "number";});

          this._c_ABSTRACT();
        },

        delete: function(serverType, id) {
          // summary:
          //   Returns a URL to delete an object of the given `serverType`.
          this._c_pre(function() {return typeOf(serverType) === "string";});
          this._c_pre(function() {return typeOf(id) === "number";});

          this._c_ABSTRACT();
        }

      });

      return UrlBuilder;
    }
);
