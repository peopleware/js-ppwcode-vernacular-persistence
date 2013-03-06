define(["dojo/_base/declare", "dojo/_base/lang"],
    function(declare, lang) {

      var UrlBuilder = declare([PersistentObject], {
        // summary:
        //   An interface for which you have to provide an implementation.
        //   Instances, when operational, return url's for CRUD functions,
        //   for specific objects.
        //   How they do it, is up to the implementation.

        _c_invar: [
        ],

        retrieve: function(serverType, id) {
          // summary:
          //   Returns a URL to retrieve an object of the given `serverType` with the given id.

          this._c_pre(function() {return serverType && lang.isString(serverType);});
          this._c_pre(function() {return id && lang.isNumber(id);});

          this._c_ABSTRACT();
        },

        create: function(serverType, id) {
          // summary:
          //   Returns a URL to create an object of the given `serverType`.

          this._c_pre(function() {return serverType && lang.isString(serverType);});

          this._c_ABSTRACT();
        }

      });

      return UrlBuilder;
    }
);
