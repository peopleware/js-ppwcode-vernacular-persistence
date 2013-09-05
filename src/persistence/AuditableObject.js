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
        //   return the same or later values for `lastModifiedAt`. `lastModifiedBy` can change at will.

        _c_invar: [
          function() {return this._c_prop_string("lastModifiedBy");},
          function() {return this._c_prop_date("lastModifiedAt");},
          function() {return compareDate(this.get("lastModifiedAt"), new Date()) <= 0;},
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
          this._c_pre(function() {return this._c_prop_string(json, "lastModifiedBy");});
          this._c_pre(function() {return this._c_prop_mandatory(json, "lastModifiedBy");});
          this._c_pre(function() {return this._c_prop_string(json, "lastModifiedAt") || this._c_prop_date(json, "lastModifiedAt");});
          this._c_pre(function() {return this._c_prop_mandatory(json, "lastModifiedAt");});
          this._c_pre(function() {
            return InsertAuditableObject.compareDate(InsertAuditableObject.stringToDate(json.lastModifiedAt), new Date()) <= 0;
          });
          this._c_pre(function() {
            return InsertAuditableObject.compareDate(this.get("lastModifiedAt"), InsertAuditableObject.stringToDate(json.lastModifiedAt)) <= 0;
          });
          this._c_pre(function() {return !!json.lastModifiedBy === !!json.lastModifiedAt;});

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
