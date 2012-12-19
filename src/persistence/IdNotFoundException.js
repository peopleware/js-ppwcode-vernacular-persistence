define(["dojo/_base/declare", "ppwcode/exceptions/SemanticException"],
    function(declare, SemanticException) {

      var IdNotFoundException = declare("be.ppwcode.vernacular.persistence.IdNotFoundException", [SemanticException], {

        // MUDO

        constructor: function(/*Object*/ props) {
        }

      });

      return IdNotFoundException;
    }
);
