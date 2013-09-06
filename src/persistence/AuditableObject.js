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

define(["dojo/_base/declare", "./InsertAuditableObject", "module"],
    function(declare, InsertAuditableObject, module) {

      var AuditableObject = declare([InsertAuditableObject], {
        // summary:
        //   Objects of this type also track who made the last change when.
        //   They have a `lastModifiedAt` and `lastModifiedBy` property, which is set by the server.
        //   These properties cannot be set in the UI, and are initially null. Once set, the server should always
        //   return the same or later values for `lastModifiedAt`. `lastModifiedBy` can change at will, but never to
        //   null, except after delete, when they all turn null together again.

        _c_invar: [
          function() {return this._c_prop_string("lastModifiedBy");},
          function() {return this._c_prop_date("lastModifiedAt");},
          /*
           lastModifiedAt must be in the past
           but we cannot test that: server time and time of this local computer are incomparable
           */
          /* MUDO disabled because of problem in the server
          function() {return !!this.get("persistenceId") === !!this.get("lastModifiedBy");}, // both exist together or not
          */
          function() {return !!this.get("lastModifiedBy") === !!this.get("lastModifiedAt");} // both exist together or not
        ],

        // lastModifiedBy: String
        lastModifiedBy: null,

        // lastModifiedAt: Date
        lastModifiedAt: null,

        _lastModifiedAtSetter: function() {
          // lastModifiedAt is read-only
          throw "ERROR lastModifiedAt is read-only";
        },

        _lastModifiedBySetter: function() {
          // lastModifiedBy is read-only
          throw "ERROR lastModifiedBy is read-only";
        },

        reload: function(/*Object*/ json) {
          // created.. can change from null to an actual date and username number after create,
          this._c_pre(function() {return json;});
          /* MUDO disabled because of problem in the server
          this._c_pre(function() {return !!json.persistenceId === !!json.lastModifiedBy;});
          */
          this._c_pre(function() {return !!json.lastModifiedBy === !!json.lastModifiedBy;});
          this._c_pre(function() {return this._c_prop_string(json, "lastModifiedBy");});
          this._c_pre(function() {return this._c_prop_string(json, "lastModifiedAt") || this._c_prop_date(json, "lastModifiedAt");});
          /* MUDO disabled because of problem in the server
          this._c_pre(function() {
            return !json.persistenceId ||
              InsertAuditableObject.compareDate(
                this.get("lastModifiedAt"),
                InsertAuditableObject.stringToDate(json.lastModifiedAt)) <= 0;
          });
          */

          this._changeAttrValue("lastModifiedBy", json.lastModifiedBy);
          this._changeAttrValue("lastModifiedAt", InsertAuditableObject.stringToDate(json.lastModifiedAt));
        },

        // it makes no senses whatsoever to send this data back to the back-end

        _stateToString: function(/*String[]*/ toStrings) {
          toStrings.push("lastModifiedAt: " + this.lastModifiedAt);
          toStrings.push("lastModifiedBy: " + this.lastModifiedBy);
        }
      });

      AuditableObject.mid = module.id;
      return AuditableObject;
    }
);
