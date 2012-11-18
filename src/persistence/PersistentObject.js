define(["dojo/_base/declare", "ppwcode/semantics/SemanticObject"],
  function(declare, SemanticObject) {

    function internalReload(/*PersistentObject*/ self, /*Object*/ json) {
      if (json && json.persistenceId /* TODO json.persistenceId undefined, but not null */) {
        if (self.persistenceId && json.persistenceId != self.persistenceId) {
          throw "ERROR cannot change from an existing persistenceId to another or null"; // MUDO better error, precondition
        }
        if (! self.persistenceId) {
          // this will happen with the JSON response from a creation, and during construction
          self._changeAttrValue("persistenceId", json.persistenceId);
        }
      }
    }

    var PersistentObject = declare("be.ppwcode.vernacular.persistence.PersistentObject",
                                   [SemanticObject], {

      _c_invar: [
        function() {return this.hasOwnProperty("persistenceId");}
        /* we don't care about the format of the persistenceId here; we just keep it, and return it to the server
         like we got it. */
      ],

      constructor: function(/*Object*/ props) {
        /* we don't care about the format of the persistenceId here; we just keep it, and return it to the server
         like we got it. */

        this.persistenceId = null; // init for when there are no props
        internalReload(this, props);
      },

      reload: function(/*Object*/ json) {
        // persistenceId can change from null to an actual number
        this.inherited(arguments);
        internalReload(this, json);
      },

      _persistenceIdGetter: function() {
        return this.persistenceId;
      },

      _persistenceIdSetter: function() {
        // persistenceId is read-only
        throw "error"; // MUDO Make this a special kind of Error (ppwcode exceptions)
      },

      toJsonObject: function() {
        var json = this.inherited(arguments);
        json.persistenceId = this.persistenceId;
        return json; // return Object
      },

      _stateToString: function() {
        return this.inherited(arguments) + "persistenceId: " + this.persistenceId;
      }
    });

    return PersistentObject; // return PersistentObject
  }
);
