define(["dojo/_base/declare", "./PersistentObject"],
    function(declare, PersistentObject) {

      function internalReload(/*AuditableObject*/ self, /*Object*/ json) {
        if (json && json.createdAt && json.createdBy && json.lastModifiedAt && json.lastModifiedBy /* TODO json.... undefined, but not null */) {
          // all data or nothing;
          // TODO add precondition for this
          if ((self.createdAt || self.createdBy) &&
              ((self.createdAt && json.createdAt != self.createdAt) ||
               (self.createdBy && json.createdBy != self.createdBy))) {
            throw "ERROR cannot change from existing created information to null"; // MUDO better error, precondition
          }
          if (self.lastModifiedAt && json.lastModifiedAt < self.lastModifiedAt) {
            throw "ERROR cannot become an earlier modified version"; // MUDO better error, precondition
          }
          if (self.lastModifiedBy && !json.lastModifiedBy) {
            throw "ERROR cannot change to lastModifiedBy == null"; // MUDO better error, precondition
          }
          // this will happen with the JSON response from a creation or update, and during construction
          if (! self.createdBy) {
            //noinspection JSUnresolvedFunction
            self._changeAttrValue("createdAt", json.createdAt);
            //noinspection JSUnresolvedFunction
            self._changeAttrValue("createdBy", json.createdBy);
          }
          //noinspection JSUnresolvedFunction
          self._changeAttrValue("lastModifiedAt", json.lastModifiedAt);
          //noinspection JSUnresolvedFunction
          self._changeAttrValue("lastModifiedBy", json.lastModifiedBy);
        }
      }

      var AuditableObject = declare("be.ppwcode.vernacular.persistence.AuditableObject", [PersistentObject], {
        // created.. can change from null to value, but then no more
        // lastModified.. can change all the time, but ..At can only become bigger

        _c_invar: [
          function() {return this.hasOwnProperty("createdAt");},
          function() {return this.hasOwnProperty("createdBy");},
          function() {return this.hasOwnProperty("lastModifiedAt");},
          function() {return this.hasOwnProperty("lastModifiedBy");}
          // TODO should be strings and times
        ],

        constructor: function(/*Object*/ props) {
          /* we don't care about the format of the data here; we just keep it, and return it to the server
           like we got it. */

          this.createdAt = null;
          this.createdBy = null;
          this.lastModifiedAt = null;
          this.lastModifiedBy = null;
          internalReload(this, props);
        },

        reload: function(/*Object*/ json) {
          // created.. can change from null to an actual date and username number after create,
          // lastModified.. to, but then again with each update
          internalReload(this, json);
        },

        // getters are implicit; create when needed (for documentation)
        // MUDO documentation

        _createdAtSetter: function() {
          // persistenceId is read-only
          throw "error"; // MUDO Make this a special kind of Error (ppwcode exceptions)
        },

        _createdBySetter: function() {
          // persistenceId is read-only
          throw "error"; // MUDO Make this a special kind of Error (ppwcode exceptions)
        },

        _lastModifiedAtSetter: function() {
          // persistenceId is read-only
          throw "error"; // MUDO Make this a special kind of Error (ppwcode exceptions)
        },

        _lastModifiedBySetter: function() {
          // persistenceId is read-only
          throw "error"; // MUDO Make this a special kind of Error (ppwcode exceptions)
        },

        _extendJsonObject: function(/*Object*/ json) {
          // NOP: it makes no senses whatsoever to send this data back to the back-end
        },

        _stateToString: function(/*Array of String*/ toStrings) {
          toStrings.push("createdAt: " + this.createdAt);
          toStrings.push("createdBy: " + this.createdBy);
          toStrings.push("lastModifiedAt: " + this.lastModifiedAt);
          toStrings.push("lastModifiedBy: " + this.lastModifiedBy);
        }
      });

      return AuditableObject;
    }
);
