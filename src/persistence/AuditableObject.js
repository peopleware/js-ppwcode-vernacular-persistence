define(["dojo/_base/declare", "./PersistentObject", "dojo/date"],
    function(declare, PersistentObject, dojoDate) {

      function internalReload(/*AuditableObject*/ self, /*Object*/ json) {
        if (json && json.createdAt && json.createdBy && json.lastModifiedAt && json.lastModifiedBy /* TODO json.... undefined, but not null */) {
          // all data or nothing;
          // TODO add precondition for this
          if ((self.createdAt || self.createdBy) &&
              ((self.createdAt && (dojoDate.compare(json.createdAt, self.createdAt) !== 0)) ||
               (self.createdBy && json.createdBy != self.createdBy))) {
            throw "ERROR cannot change from existing created information"; // TODO precondition
          }
          if (self.lastModifiedAt && json.lastModifiedAt < self.lastModifiedAt) {
            throw "ERROR cannot become an earlier modified version"; // TODO precondition
          }
          if (self.lastModifiedBy && !json.lastModifiedBy) {
            throw "ERROR cannot change to lastModifiedBy == null"; // TODO precondition
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

      var AuditableObject = declare([PersistentObject], {
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
        // TODO documentation

        _createdAtSetter: function() {
          // createdAt is read-only
          throw "ERROR";
        },

        _createdBySetter: function() {
          // createdBy is read-only
          throw "ERROR";
        },

        _lastModifiedAtSetter: function() {
          // lastModifiedAt is read-only
          throw "ERROR";
        },

        _lastModifiedBySetter: function() {
          // lastModifiedBy is read-only
          throw "ERROR";
        },

        _extendJsonObject: function(/*Object*/ json) {
          // it makes no senses whatsoever to send this data back to the back-end

          // HOWEVER due to an idiosyncrasy in our current server, it is much nicer
          //         if we do send back the created-attributes
          // In any case, it should be in nobody's way.
          json.createdBy = this.createdBy;
          json.createdAt = this.createdAt;
          // IDEA resolve this issue in the server
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
