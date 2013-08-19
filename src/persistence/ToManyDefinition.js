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

define(["dojo/_base/declare", "ppwcode/contracts/_Mixin", "ppwcode/oddsAndEnds/typeOf"],
  function(declare, _ContractsMixin, typeOf) {

    var ToManyDefinition = declare([_ContractsMixin], {
      // summary:
      //   Instances define a to-many relationship, expressed as a bidirectional
      //   one-to-many association, from objects of a given subtype of PersistentObject
      //   `O` to objects of a given subtype of PersistentObject `M`.
      //   These instances belong in the prototype of `O`. Each instance of `O`
      //   that is created by polymorphAmdRevive will have a separate instance
      //   of LazyToManyStore, defined by this instance, for the property in
      //   which this definition is found in the prototype.

      _c_invar: [
        function() {return this._c_prop_mandatory("serverPropertyName");},
        function() {return this._c_prop_string("serverPropertyName");}
      ],

      // serverPropertyName: String
      //   The name of the to-many property of the type this definition is used in
      //   in the server. A UrlBuilder will be asked to form a URL to load the associated
      //   many objects based on this name and the object that has the to-many association.
      serverPropertyName: null,

      constructor: function(/*String*/ serverPropertyName) {
        this._c_pre(function() {return serverPropertyName && typeOf(serverPropertyName) === "string";});

        this.serverPropertyName = serverPropertyName;
      },

      toString: function() {
        return "ToManyDefinition{" + this.serverPropertyName + "}";
      }

    });

    return ToManyDefinition; // return ToManyDefinition
  }
);
