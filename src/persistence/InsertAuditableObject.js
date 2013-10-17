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

define(["dojo/_base/declare", "./PersistentObject", "ppwcode-util-oddsAndEnds/js", "dojo/date/stamp",
        "ppwcode-util-oddsAndEnds/log/logger!", "module"],
    function(declare, PersistentObject, js, dateStamp,
             logger, module) {

      function stringToDate(candidate) {
        //noinspection FallthroughInSwitchStatementJS
        switch (js.typeOf(candidate)) {
          case "undefined":
          case "null":
            return null;
          case "date":
            return candidate;
          case "string":
            return dateStamp.fromISOString(candidate);
          default:
            logger.error("cannot convert to date: ", candidate, js.typeOf(candidate));
            throw "ERROR: cannot convert to date: " + candidate;
        }
      }

      function compareDate(d1, d2) {
        // summary:
        //   We use < 1000 (1s) instead of < 0, because the server stores dates only to the second.
        //   With the current server implementation, we see that if we retrieve quickly after an
        //   update or create, the retrieve lastModified at is later than the one in the response
        //   of the action. The reason is, that the data in the action response comes from RAM,
        //   and has values up to the nanosecond or so (23/6/2012 15:45:32.424242242), while the
        //   data in the retrieve comes from the DB, which only stores up to the second
        //   (23/6/2012 15:45:32). So, it seems that retrieve-date is earlier than the action
        //   response date, which is impossible. By giving our comparison a 1 second leeway,
        //   this is resolved.

        if (d1 === d2) {
          return 0;
        }
        if (!d1) {
          return -1;
        }
        if (!d2) {
          return +1;
        }
        var delta = d1.getTime() - d2.getTime();
        if (delta < -1000) {
          return -1;
        }
        if (delta > +1000) {
          return +1;
        }
        return 0;
      }

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

      // MUDO Attempted workaround for PICTOPERFECT-484: send the data to the server

      var InsertAuditableObject = declare([PersistentObject], {
        // InsertAuditableObjects have a `createdAt` and `createdBy` property, which is set by the server.
        // These properties cannot be set in the UI, and are initially null. Once set, the server should always
        // return the same values, except after delete, when they all turn null together again.

        _c_invar: [
          function() {return this._c_prop_string("createdBy");},
          function() {return this._c_prop_date("createdAt");},
          /*
            createdAt must be in the past
            but we cannot test that: server time and time of this local computer are incomparable
           */
          function() {return !!this.get("persistenceId") === !!this.get("createdBy");}, // both exist together or not
          function() {return !!this.get("createdBy") === !!this.get("createdAt");} // both exist together or not
        ],

        // createdBy: String
        createdBy: null,

        // createdAt: Date
        createdAt: null,

        _createdAtSetter: function() {
          // createdAt is read-only
          throw "ERROR createdAt is read-only";
        },

        _createdBySetter: function() {
          // createdBy is read-only
          throw "ERROR createdBy is read-only";
        },

        reload: function(/*Object*/ json) {
          // created.. can change from null to an actual date and username number after create,
          this._c_pre(function() {return json;});
// MUDO PICTOPERFECT-482          this._c_pre(function() {return !!json.persistenceId === !!json.createdBy;});
          this._c_pre(function() {return !!json.createdBy === !!json.createdAt;});
          this._c_pre(function() {return this._c_prop_string(json, "createdBy");});
          /*
          this._c_pre(function() {return !this.get("persistenceId") || !json.persistenceId || (this.get("createdBy") === json.createdBy);});
          The above is true, from the outside, but we cannot test it here, with this contract framework, because persistenceId is set
          by the superclass from null to the new value (on create) before we reach this test. It was true before reload, but not
          halfway. What follows is an equivalent local version.
          */
// MUDO PICTOPERFECT-482          this._c_pre(function() {return !this.get("createdBy") || !json.persistenceId || (this.get("createdBy") === json.createdBy);});

          logger.debug("Trying to convert to date: ", json.createdAt);

          this._c_pre(function() {return this._c_prop_string(json, "createdAt") || this._c_prop_date(json, "createdAt");});
          this._c_pre(function() {return !this.get("createdBy") || !json.persistenceId || compareDate(this.get("createdAt"), stringToDate(json.createdAt)) === 0;});
          if (!this.get("createdBy") || !json.createdBy) {
            this._changeAttrValue("createdBy", json.createdBy);
            this._changeAttrValue("createdAt", stringToDate(json.createdAt));
          }
        },

        // it makes no senses whatsoever to send this data back to the back-end
        // MUDO Workaround for PICTOPERFECT-484: send the data to the server; this does eem to do the trick; is the timezone info above no longer applicable?

        _extendJsonObject:function (/*Object*/ json) {
          json.createdBy = this.get("createdBy");
          json.createdAt = this.get("createdAt");
        },

        _stateToString: function(/*String[]*/ toStrings) {
          toStrings.push("createdAt: " + this.createdAt);
          toStrings.push("createdBy: " + this.createdBy);
        }
      });

      InsertAuditableObject.mid = module.id;
      InsertAuditableObject.stringToDate = stringToDate;
      InsertAuditableObject.compareDate = compareDate;
      return InsertAuditableObject;
    }
);
