define(["dojo/_base/declare", "ppwcode-vernacular-semantics/Value", "module"],
    function(declare, Value, module) {

      var ReferenceValue = declare([Value], {
        // summary:
        //   Values that represent a reference to a `PersistentObject`.
        //   They contain a `referenceType`, i.e., the constructor of the PeristentObject subclass
        //   that is referenced, and a `referenceId`, i.e., the `persistenceId` of the referenced object.
        // description:
        //   `referenceType` does not have to be a concrete type
        //
        //   Since we often have server objects with a different naming convention, infrastructure is in place
        //   to create subclasses that help dealing with JSON input and output with different naming conventions.
        //   The prototype has the property `jsonReferenceIdName`. This name is mapped to and from the referenceId.


        // jsonReferenceIdName: String
        //   Name of the `referenceId` property in JSON
        jsonReferenceIdName: "referenceId",

        // referenceType: Function
        //   The constructor of the referenced object, or of one of its superclasses.
        referenceType: null,

        _c_invar: [
          function() {return this._c_prop_mandatory("jsonReferenceIdName");},
          function() {return this._c_prop_string("jsonReferenceIdName");},
          function() {return this._c_prop_mandatory("referenceType");},
          function() {return this._c_prop_function("referenceType");},
          function() {return this._c_prop_mandatory("referenceId");},
          function() {return this._c_prop_int("referenceId");}
        ],

        // referenceId: Number
        //   The persistenceId of the referenced object
        referenceId: null,

        constructor: function(/*Object*/ props) {
          this._c_pre(function() {return props;});
          this._c_pre(function() {return this._c_prop_mandatory(props, "referenceId") || this._c_prop_mandatory(props, this.jsonReferenceIdName);});
          this._c_pre(function() {return this._c_prop_int(props, "referenceId") || this._c_prop_int(props, this.jsonReferenceIdName);});

          this.referenceId = props.referenceId || props[this.jsonReferenceIdName];
        },

        compare: function(/*ReferenceValue*/ other) {
          // summary:
          //   We use the `referenceId` as basis for ordering, barring a better way. This does not make much
          //   sense in a UI.
          this._c_pre(function() {return !other || (other.isInstanceOf && other.isInstanceOf(this.constructor));});

          return this.referenceId - other.referenceId;
        },

        equals: function(/*ReferenceValue*/ other) {
          // summary:
          //   Corresponding types and `referenceId`

          return this.inherited(arguments) &&
            (this.referenceType.prototype.isInstanceOf(other.referenceType) || other.referenceType.prototype.isInstanceOf(this.referenceType)) &&
            this.referenceId === other.referenceId;
        },

        getValue: function() {
          return "" + this.referenceId; // must be a String
        },

        _extendJsonObject: function(/*Object*/ json) {
          json.referenceType = this.referenceType;
          json[this.jsonReferenceIdName] = this.referenceId;
        },

        _stateToString: function(/*Array of String*/ toStrings) {
          toStrings.push("referenceType: " + (this.referenceType.mid && this.referenceType.mid ? this.referenceType.mid : "-- no MID in Constructor --"));
          toStrings.push("referenceId: " + this.referenceId);
        }

      });

      ReferenceValue.format = function(referenceValue, options) {
        if (!referenceValue) {
          return (options && (options.na || options.na === "")) ? options.na : 'N/A';
        }
        else {
          return referenceValue.referenceId;
        }
      };

      ReferenceValue.parse = function(str, options) {
        if (!str || str === (options && options.na ? options.na : 'N/A')) {
          return null;
        }
        else {
          throw "NOT IMPLEMENTED"; // IDEA: pick from all objects of referenceType? needs crudDao
        }
      };

      ReferenceValue.mid = module.id;
      ReferenceValue.persistenceType = module.id;

      return ReferenceValue;
    }
);
