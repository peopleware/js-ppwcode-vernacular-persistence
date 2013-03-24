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

define(["dojo/_base/declare", "./PersistentObject", "dojo/date", "dojo/_base/lang"],
    function(declare, PersistentObject, dojoDate, lang) {

      function internalReload(/*AuditableObject*/ self, /*Object*/ json) {
        // MUDO what about Sample, this only has a createdAt and not a lastModifiedAt, so now createdAt won't be set !!!
        if (json && json.createdAt && json.createdBy && json.lastModifiedAt && json.lastModifiedBy /* TODO json.... undefined, but not null */) {
          // all data or nothing;
          // TODO add precondition for this
          if ((self.createdAt || self.createdBy) &&
              ((self.createdAt && (dojoDate.compare(json.createdAt, self.createdAt) !== 0)) ||
               (self.createdBy && json.createdBy != self.createdBy))) {
            throw "ERROR cannot change from existing created information"; // TODO precondition
          }
          var jsonLastModifiedAt = null;
          if (lang.isString(json.lastModifiedAt)) {
            // MUDO HACK see below
            if (json.lastModifiedAt.indexOf("+00:00") < 0) {
              // there is no timezone information in the string
              json.lastModifiedAt += "+00:00";
            }
            // MUDO end hack
            jsonLastModifiedAt = new Date(json.lastModifiedAt);
          }
          else {
            jsonLastModifiedAt = json.lastModifiedAt; // presumed to be a data already
          }
          if (self.lastModifiedAt && 1000 < self.lastModifiedAt.getTime() - jsonLastModifiedAt.getTime()) {
            // We use < 1000 (1s) instead of < 0, because the server stores dates only to the second.
            // With the current server implementation, we see that if we retrieve quickly after an
            // update or create, the retrieve lastModified at is later than the one in the response
            // of the action. The reason is, that the data in the action response comes from RAM,
            // and has values up to the nanosecond or so (23/6/2012 15:45:32.424242242), while the
            // data in the retrieve comes from the DB, which only stores up to the second
            // (23/6/2012 15:45:32). So, it seems that retrieve-date is earlier than the action
            // response date, which is impossible. By giving our comparison a 1 second leeway,
            // this is resolved.
            // IDEA solve in the server
            // MUDO There is a much worse problem: a RAM-created server Date is in the local time of the server
            //      While the time in the DB has no timezone. A RAM-created server Date that is sent over JSON
            //      contains timezone information. A date that is retrieved from the DB does not contain
            //      timezone in RAM, and thus does also not contain timezone information when it is sent over
            //      JSON.
            //      When JavaScript parses a string with timezone information, it takes it into account.
            //      When JavaScript parses a string without timezone information, it assumes the local
            //      timezone.
            //      When server and client are in a different timezone, when the JSON contains timezone information,
            //      the string is interpreted in the timezone of the server. When the JSON does not contain
            //      timezone information, the string is interpreted in the timezone of the client.
            //      For webapplications, this in unacceptable.
            // MUDO for now we work around this by NOT SENDING THE DATA TO THE SERVER IN THE FIRST PLACE
            //      that was another workaround; the effect of this is that we will not see this data after update
            // MUDO but it is obviously wrong
            throw "ERROR cannot become an earlier modified version"; // TODO precondition
          }
          if (self.lastModifiedBy && !json.lastModifiedBy) {
            throw "ERROR cannot change to lastModifiedBy == null"; // TODO precondition
          }
          // this will happen with the JSON response from a creation or update, and during construction
          if (! self.createdBy) {
            var jsonCreatedAt = null;
            if (lang.isString(json.createdAt)) {
              // MUDO HACK see above
              if (json.createdAt.indexOf("+00:00") < 0) {
                // there is no timezone information in the string
                json.createdAt += "+00:00";
              }
              // MUDO end hack
              jsonCreatedAt = new Date(json.createdAt);
            }
            else {
              jsonCreatedAt = json.createdAt; // already is presumed a Date
            }
            //noinspection JSUnresolvedFunction
            self._changeAttrValue("createdAt", jsonCreatedAt);
            //noinspection JSUnresolvedFunction
            self._changeAttrValue("createdBy", json.createdBy);
          }
          //noinspection JSUnresolvedFunction
          self._changeAttrValue("lastModifiedAt", jsonLastModifiedAt);
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
