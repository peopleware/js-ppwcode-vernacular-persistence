define(["dojo/_base/declare", "./PersistentObject"],
  function(declare, PersistentObject) {

    function internalReload(/*VersionedPersistentObject*/ self, /*Object*/ json) {
      if (json && json.persistenceVersion /* TODO json.persistenceVersion undefined, but not null */) {
        if (self.persistenceVersion && json.persistenceVersion < self.persistenceVersion) {
          throw "ERROR: cannot become an earlier version"; // TODO precondition
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

      /*
      _persistenceVersionGetter: function() {
        return this.persistenceVersion;
      },
      */

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
