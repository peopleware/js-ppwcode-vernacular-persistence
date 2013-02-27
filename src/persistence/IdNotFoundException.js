define(["dojo/_base/declare", "ppwcode/exceptions/SemanticException"],
    function(declare, SemanticException) {

      var IdNotFoundException = declare([SemanticException], {

        // MUDO

        constructor: function(/*Object*/ props) {
        }

      });

      return IdNotFoundException;
    }
);
