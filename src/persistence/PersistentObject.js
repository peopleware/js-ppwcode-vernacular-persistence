/*
 Copyright 2012 - $Date $ by PeopleWare n.v.

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

define(["dojo/_base/declare", "ppwcode.semantics/SemanticObject", "dojo/_base/lang", "ppwcode.oddsAndEnds/typeOf"],
  function(declare, SemanticObject, lang, typeOf) {

    function internalReload(/*PersistentObject*/ self, /*Object*/ json) {
      if (json) {
        if (typeOf(json.persistenceId) === "undefined") {
          throw "ERROR: json.persistenceId must be defined (but can be null)";
        }
        if (self.persistenceId && json.persistenceId != null && json.persistenceId != self.persistenceId) {
          throw "ERROR: cannot change from an existing persistenceId to another (" +
            json.toString() + ")"; // TODO precondition
        }
        // this will happen with the JSON response from a creation or IdNotFoundException, and during construction
        //noinspection JSUnresolvedFunction
        self._changeAttrValue("persistenceId", json.persistenceId);
      }
    }

    var PersistentObject = declare([SemanticObject], {

      _c_invar: [
        function() {return this._c_prop_mandatory("persistenceType");},
        function() {return this._c_prop_string("persistenceType");},
        function() {return this.hasOwnProperty("persistenceId");},
        /* we don't care about the format of the persistenceId here; we just keep it, and return it to the server
         like we got it. */
        function() {return this.get("persistenceId") === null || lang.isString(this.getKey());}
      ],

      // persistenceType: String
      //   Precise name of the type of this object in server lingo.
      //   This is needed for create, update, and delete, where the server
      //   methods are polymorph.
      //   (Note: this is currently so, but in general, this is not needed.
      //    With good rest we should pass the type for update, create and delete
      //    via the URL. The other way around is necessary, for a polymorph retrieve.
      //    Consider this a fix for now.
      //    IDEA solve this on the server)
      //   This property should be set on the prototype of each type, and not be
      //   changed ever. It should never have a value on the level of the instance.
      persistenceType: null,

      // persistenceId: Object
      //   Normally a number. The primary key of this object in the server.
      //   Before the object is created in persistent storage, it must be null.
      //   That is how we know the object is fresh.
      //   Afterwards, it may never change. It is under control of the server.
      //   We actually don't care what type this is. We just store, and return to the server.
      persistenceId: null,

//      constructor: function(/*Object*/ props) {
//        /* we don't care about the format of the persistenceId here; we just keep it, and return it to the server
//         like we got it. */
//
//        if (props && props.persistenceId) {
//          this.persistenceId = props.persistenceId;
//        }
//        else {
//          this.persistenceId = null;
//        }
//      },

      reload: function(/*Object*/ json) {
        this._c_pre(function() {return json;});
        this._c_pre(function() {return this._c_prop("persistenceId");});
        // persistenceId can change from null to an actual number, but not the other way around
        // this will happen with the JSON response from a creation or IdNotFoundException, and during construction
        this._c_pre(function() {return !this.get("persistenceId") || (json.persistenceId  === this.get("persistenceId"));});

        //noinspection JSUnresolvedFunction
        this._changeAttrValue("persistenceId", json.persistenceId);
      },

      _persistenceTypeSetter: function() {
        // persistenceId is read-only
        throw "ERROR: persistence type may only be set in the type definition";
      },

      _persistenceIdSetter: function() {
        // persistenceId is read-only
        throw "ERROR: the persistence id can never change";
      },

      getKey: function() {
        // summary:
        //   A (business) key (String) that uniquely identifies
        //   the object represented by this (if we all keep to the rules).
        //   Can only be called when this.get("persistenceId") !== null.

        return PersistentObject.keyForObject(this);
      },

      _extendJsonObject: function(/*Object*/ json) {
        json["$type"] = this.persistenceType; // "$type" is a magic string, mandated by JSON.net TODO fix this
        json.persistenceId = this.persistenceId;
      },

      getTypeDescription: function() {
        // summary:
        //   For PersistentObject instances, this is the persistenceType, which should exist
        //   in concrete classes at least.
        // description:
        //   The superclass implementation is used as fallback, as toString is often used in debug.
        return this.persistenceType ? this.persistenceType : this.inherited(arguments);
      },

      _stateToString: function(/*Array of String*/ toStrings) {
        toStrings.push("persistenceId: " + this.persistenceId);
      }
    });



    PersistentObject.parseKey = function(/*String*/ key) {
      var parts = key.split("@");
      return {mid: parts[0], persistenceId: parts[1]};
    };

    PersistentObject.keyForId = function(/*String*/ persistenceType, /*Number*/ id) {
      // IDEA can't use current form of precondition here

      /* IDEA
         after a major bug was found, it is clear that this should be changed to take a Constructor
         as argument, and not a String
         we can get the persistence type as Constructor.prototype.persistenceId now, and as
         Constructor.mid later
         This will propagate further over different classes, but it is a problem nowhere,
         except in CrudDao retrieve. But maybe there we use a Constructor better too?
         Also for the abstract classes?
         If we don't want to do that, we cannot change it to a Constructor here either.
       */

      if (! (persistenceType && lang.isString(persistenceType))) {
        throw new Error("precondition violation: persistenceType && lang.isString(persistenceType)");
      }

      if (!id) {
        return null;
      }
      return persistenceType + "@" + id; // return String
    };

    PersistentObject.keyForObject = function(/*PersistentObject*/ po) {
      // summary:
      //   po --> String
      //   A function that returns a unique (business) key (String) that uniquely identifies
      //   the object represented by po (if we all keep to the rules).
      //   Can only be called when po.get("persistenceId") !== null.

      // IDEA can't use current form of precondition here
      if (!po) {
        throw new Error("precondition violation: po");
      }

      var serverType = po.get("persistenceType") || po.constructor.mid;
      return PersistentObject.keyForId(serverType, po.get("persistenceId")); // return String
    };



    return PersistentObject; // return PersistentObject
  }
);
