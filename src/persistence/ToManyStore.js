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

define(["dojo/_base/declare", "./PersistentObjectStore", "dojo/Stateful", "ppwcode-util-oddsAndEnds/typeOf", "ppwcode-util-oddsAndEnds/promise/Arbiter"],
  function(declare, PersistentObjectStore, Stateful, typeOf, Arbiter) {

    var ToManyStore = declare([PersistentObjectStore, Stateful], {
      // summary:
      //   Instances define a to-many relationship, expressed as a bidirectional
      //   one-to-many association, from objects of a given subtype of PersistentObject
      //   `O` to objects of a given subtype of PersistentObject `M`.
      //   Instances should be created in the constructor of `O`, because they cannot
      //   be shared by instances of that type.
      //   The constructor takes the property name as it is defined on the _server_
      //   in the options `kwargs.serverPropertyName`.
      //   Reloading should be done by CrudDao.retrieveToMany.
      //   This is a PersistentObjectStore, with an extra property "lastReloaded", which
      //   is initially null, and should be set only by CrudDao.retrieveToMany. Thus,
      //   users know that the store is never loaded when this property is null.

      _c_invar: [
        function() {return this._c_prop_mandatory("serverPropertyName");},
        function() {return this._c_prop_string("serverPropertyName");},
        function() {return this._c_prop("lastReloaded");} // TODO date
      ],

      // serverPropertyName: String
      //   The name of the to-many property of the type this definition is used in
      //   in the server. A UrlBuilder will be asked to form a URL to load the associated
      //   many objects based on this name and the object that has the to-many association.
      serverPropertyName: null,

      // lastReloaded: Date?
      //   The time of last reload. Null if never reloaded. Should only be set by CrudDao.retrieveToMany.
      lastReloaded: null,

      // _arbiter: Arbiter
      //   Arbiter for CrudDao.retrieveToMany
      _arbiter: null,

      constructor: function(/*Object*/ kwargs) {
        this._c_pre(function() {return kwargs && kwargs.serverPropertyName && typeOf(kwargs.serverPropertyName) === "string";});

        this.serverPropertyName = kwargs.serverPropertyName;
        this._arbiter = new Arbiter();
      },

      toString: function() {
        return "ToManyDefinition{" + this.serverPropertyName + ": " + this.inherited(arguments) + "}";
      }

    });

    return ToManyStore; // return ToManyStore
  }
);
