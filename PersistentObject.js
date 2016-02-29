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

define(["dojo/_base/declare",
        "ppwcode-vernacular-semantics/SemanticObject", "ppwcode-vernacular-semantics/IdentifiableObject",
        "dojo/_base/lang"],
  function(declare,
           SemanticObject, IdentifiableObject,
           lang) {

    var PersistentObject = declare([SemanticObject, IdentifiableObject], {

      _c_invar: [
        function() {return this.hasOwnProperty("persistenceId");},
        /* we don't care about the format of the persistenceId here; we just keep it, and return it to the server
         like we got it. */
        function() {return this.get("persistenceId") === null || lang.isString(this.getKey());}
      ],

      // persistenceId: Object
      //   Normally a number. The primary key of this object in the server.
      //   Before the object is created in persistent storage, it must be null.
      //   That is how we know the object is fresh.
      //   Afterwards, it may never change. It is under control of the server.
      //   We actually don't care what type this is. We just store, and return to the server.
      persistenceId: null,

      // changeMode: Boolean
      //   This object is being edited, and we don't want `reload` to overwrite changes already made.
      changeMode: false,

      shouldNotReloadInChangeMode: function(/*Object*/ json) {
        //   When we choose to use a non-versioned PersistentObject in the model, it is because of one
        //   of two reasons. Either we know the object will never change after creation, or we don't want
        //   to use optimistic locking. In the first case, the user will never edit the object after creation.
        //   In the second case, we need to consider what we do when new data comes in.
        //   Normally, we want to reload the latest data. When the user is editing, this will
        //   overwrite the edits, either with the original data, if nothing has changed on the server,
        //   or newer data, if something has changed on the server. This will also happen when we get server
        //   data as a side effect of other operations while the user is editing. This is annoying, since the user's
        //   edits will disappear. If the operation that has this side effect is necessary for the edit, the edit
        //   becomes impossible. (An example is a search to link this object to another object, where this object
        //   itself is part of the search results).
        //
        //   We want a reload with the latest data if an edit is cancelled.
        //
        //   If we have choosen not to use optimistic locking, we have either choosen to do pessimistic locking,
        //   or we have choosen to use "last one wins". In the first case, we will never get newer data from the
        //   server while the user is editing. There is no need to reload while the user is editing, and a reload
        //   would undo the user's changes, so we should not reload. In the second case, we also should not reload.
        //   When the original data comes in, we would reset the user's edits, which we don't want, and since we
        //   want "last one wins", if new data comes in, this user is last, and his edits should remain too.
        //
        //   In summary, `reload` should not be called while we are in change mode.
        //
        //   Postcondition: result ==> this.get("changeMode")
        this._c_pre(function() {return json;});

        return this.get("changeMode");
      },

      canReload: function(/*Object*/ json) {
        // summary:
        //   `persistenceId` can change from null to an actual number, but not the other way around.
        //   This will happen with the JSON response from a creation or IdNotFoundException, and during
        //   construction.
        //   Extra postcondition:
        //   | result ==> (!this.get("persistenceId") || (json.persistenceId === this.get("persistenceId"))) &&
        //   |            (!this.get("changeMode") || this.shouldNotReloadInChangeMode(json))

        return this.inherited(arguments) &&
               (!this.get("persistenceId") || (json.persistenceId === this.get("persistenceId"))) &&
               (!this.get("changeMode") || !this.shouldNotReloadInChangeMode(json));
      },

      reload: function(/*Object*/ json) {
        this._changeAttrValue("persistenceId", json.persistenceId);
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

      getLabel: function(/*Object*/ options) {
        // summary:
        //   Semantic view model objects are often represented as a label.
        //   This method should return a string that represents this semantic object.
        // options: Object
        //   options.locale is the language the UI asks the label in; for semantic objects
        //   this can often be ignored
        //   options.formatLength can be "long" or "short" (the default); mainly, in an object
        //   graph, we need to show more than only local information for the user to recognize
        //   an object. It is good practice then to add the short label of parent objects
        //   in brackets after the local information. To avoid very long labels, the label
        //   of the parent should be short, and parent information should only be added if
        //   the UI requests a long label.
        // description:
        //   Subclasses should override this with a meaningful implementation. The default is getKey() if it is not null.

        return this.getKey();
      },

      _extendJsonObject: function(/*Object*/ json) {
        json.persistenceId = this.persistenceId;
      },

      _stateToString: function(/*Array of String*/ toStrings) {
        toStrings.push("persistenceId: " + this.persistenceId);
      }

    });



    PersistentObject.parseKey = function(/*String*/ key) {
      var parts = key.split("@");
      return {mid: parts[0], persistenceId: parts[1]};
    };

    PersistentObject.keyForId = function(/*String*/ typeDescription, /*Number*/ id) {
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

      if (! (typeDescription && lang.isString(typeDescription))) {
        throw new Error("precondition violation: typeDescription && lang.isString(typeDescription)");
      }

      if (!id) {
        return null;
      }
      return typeDescription + "@" + id; // return String
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

      //noinspection JSUnresolvedFunction
      var serverType = po.getTypeDescription();
      //noinspection JSUnresolvedFunction
      return PersistentObject.keyForId(serverType, po.get("persistenceId")); // return String
    };

    return PersistentObject; // return PersistentObject
  }
);
