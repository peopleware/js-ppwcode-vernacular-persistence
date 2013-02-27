define(["dojo/_base/declare",
        "ppwcode/semantics/ui/_SemanticObjectPane", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
        "dojo/text!./AuditableInfoPane.html", "dojo/i18n!./nls/labels",
        "ppwcode/persistence/AuditableObject",
        "dojox/mvc/Output", "dojox/mvc/at", "dojo/date/locale",
        "xstyle/css!./AuditableInfoPane.css"],
  function(declare,
           _SemanticObjectPane, _TemplatedMixin, _WidgetsInTemplateMixin,
           template, labels,
           AuditableObject) {

    return declare([_SemanticObjectPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
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
