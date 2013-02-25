define(["dojo/_base/declare",
        "ppwcode/semantics/ui/_SemanticObjectPane",
        "dojo/text!./auditableInfoPane.html", "dojo/i18n!./nls/labels",
        "ppwcode/persistence/AuditableObject",
        "dojox/mvc/Output", "dojox/mvc/at", "dojo/date/locale",
        "xstyle/css!./auditableInfoPane.css"],
  function(declare,
           _SemanticObjectPane,
           template, labels,
           AuditableObject) {

    return declare([_SemanticObjectPane], {
      // summary:
      //   This widget shows, read-only, the audit information from an `AuditableObject`,
      //   low key.

      templateString: template,
      labels: labels,

      getTargetType: function() {
        return AuditableObject;
      }

    });

  }
);
