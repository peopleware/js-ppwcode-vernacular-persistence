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

define(["dojo/_base/declare", "./PersistentObject"],
  function(declare, PersistentObject) {

    var VersionedPersistentObject = declare([PersistentObject], {

      _c_invar: [
        function() {return this.hasOwnProperty("persistenceVersion");}
        /* we don't care about the format of the persistenceVersion here; we just keep it, and return it to the server
           like we got it. */
      ],

      persistenceVersion: null,

      shouldNotReloadInChangeMode: function(/*Object*/ json) {
        //   When we choose to use VersionedPersistentObject in the model, it is because we want optimistic locking.
        //   We need to consider what we do when new data comes in.
        //   Normally, we want to reload the latest data. When the user is editing, this will
        //   overwrite the edits, either with the original data, if nothing has changed on the server,
        //   or newer data, if something has changed on the server. This will also happen when we get server
        //   data as a side effect of other operations while the user is editing. This is annoying, since the user's
        //   edits will disappear. If the operation that has this side effect is necessary for the edit, the edit
        //   becomes impossible. (An example is a search to link this object to another object, where this object
        //   itself is part of the search results).
        //
        //   We want the first effect if an edit is cancelled or when we get newer data from the server (a higher
        //   `persistenceVersion`) while the user is editing, possibly with a warning message. A lower
        //   `persistenceVersion` is not possible. When we receive data with the same `persistenceVersion`, and
        //   we are in `changeMode`, the data should not be reloaded. (When we receive data with the same
        //   `persistenceVersion`, and we are not in `changeMode`, the data should be reloaded, especially for
        //   refresh / cancel).
        //
        //   This relaxes the precondition we have in PersistentObject: there we stated that reload cannot be
        //   called when we are in change mode. Now we say that reload cannot be called when we are in change mode,
        //   except when the `persistenceVersion` is the higher.
        //   This makes it necessary to repeat the postcondition of the superclass in the extra postcondition.
        //
        //   Extra postcondition:
        //   | result ==> json.persistenceVersion === this.get("persistenceVersion")

        return this.inherited(arguments) && json.persistenceVersion === this.get("persistenceVersion");
      },

      canReload: function(/*Object*/ json) {
        // summary:
        //  `persistenceVersion` can change from null to an actual number (we expect 1, but it could be higher),
        //  but not the other way around.
        //  This will happen with the JSON response from a creation or IdNotFoundException, and during
        //  construction.
        //  `persistenceVersion` can change to a higher number, never to a lower number.
        //  `0` is an allowed version.
        //
        //   Extra postcondition:
        //   | result ==> ((!this.get("persistenceVersion") && this.get("persistenceVersion") !== 0) ||
        //   |               ((json.persistenceVersion || json.persistenceVersion === 0) &&
        //   |                 this.get("persistenceVersion") <= json.persistenceVersion))

        return this.inherited(arguments) &&
               ((!this.get("persistenceVersion") && this.get("persistenceVersion") !== 0) ||
                ((json.persistenceVersion || json.persistenceVersion === 0) &&
                  this.get("persistenceVersion") <= json.persistenceVersion));
      },

      reload: function(/*Object*/ json) {
        this._changeAttrValue("persistenceVersion", json.persistenceVersion);
      },

      _persistenceVersionSetter: function() {
        // persistenceVersion is read-only
        throw "error";
      },

      _extendJsonObject: function(/*Object*/ json) {
        json.persistenceVersion = this.persistenceVersion;
      },

      _stateToString: function(/*Array of String*/ toStrings) {
        toStrings.push("persistenceVersion: " + this.persistenceVersion);
      }
    });

    return VersionedPersistentObject;
  }
);
