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

define(["dojo/_base/declare", "ppwcode/contracts/_Mixin", "ppwcode/oddsAndEnds/typeOf", "dojo/_base/lang"],
    function(declare, _ContractMixin, typeOf, lang) {

      var UrlBuilder = declare([_ContractMixin], {
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
              return lang.hitch(this, this.retrieve);
            case "POST":
              return lang.hitch(this, this.create);
            case "PUT":
              return lang.hitch(this, this.update);
            case "DELETE":
              return lang.hitch(this, this.remove);
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

        remove: function(serverType, id) {
          // summary:
          //   Returns a URL to delete an object of the given `serverType`.
          //   Note: cannot call this "delete", because IE9 is annoying

          this._c_pre(function() {return typeOf(serverType) === "string";});
          this._c_pre(function() {return typeOf(id) === "number";});

          this._c_ABSTRACT();
        },

        allPersistenceIds: function(serverType) {
          // summary:
          //   Returns a URL to get all the persistenceIds that exist for the given
          //   `serverType`.
          this._c_pre(function() {return typeOf(serverType) === "string";});

          this._c_ABSTRACT();
        }

      });

      return UrlBuilder;
    }
);
