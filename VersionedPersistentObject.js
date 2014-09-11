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

    function internalReload(/*VersionedPersistentObject*/ self, /*Object*/ json) {
      if (json && json.persistenceVersion) {
        if (self.persistenceVersion && json.persistenceVersion < self.persistenceVersion) {
          throw "ERROR: cannot become an earlier version (was:" + self.persistenceVersion + ", json: " + json.persistenceVersion +
                " -- type: " + self.getTypeDescription() + ", persistenceId: " + self.persistenceId + ", json: " +
                JSON.stringify(json) + ")";
        }
        // this will happen with the JSON response from a creation or update, and during construction
        //noinspection JSUnresolvedFunction
        self._changeAttrValue("persistenceVersion", json.persistenceVersion);
      }
    }

    var VersionedPersistentObject = declare([PersistentObject], {

      _c_invar: [
        function() {return this.hasOwnProperty("persistenceVersion");}
        /* we don't care about the format of the persistenceVersion here; we just keep it, and return it to the server
           like we got it. */
      ],

      constructor: function(/*Object*/ props) {
        /* we don't care about the format of the persistenceVersion here; we just keep it, and return it to the server
         like we got it. */

        this.persistenceVersion = null; // init for when there are no props
        internalReload(this, props);
      },

      reload: function(/*Object*/ json) {
        // persistenceVersion can change from null to an actual number after create,
        // and to a higher number on update
        internalReload(this, json);
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
