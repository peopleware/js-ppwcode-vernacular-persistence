define(["dojo/_base/declare",
        "ppwcode.semantics/ui/_semanticObjectPane/_SemanticObjectPane", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
        "../../../test/mock/Person",
        "dojo/text!./templates/PersonPane.html", "dojo/i18n!./nls/Person",
        "dijit/form/ValidationTextBox", "dojox/mvc/at",
        "xstyle/css!ppwcode.semantics/ui/_semanticObjectPane/formCommons.css"],
  function(declare,
           _SemanticObjectPane, _TemplatedMixin, _WidgetsInTemplateMixin,
           Person,
           template, labels) {

    return declare([_SemanticObjectPane, _TemplatedMixin, _WidgetsInTemplateMixin], {

      templateString: template,
      labels: labels,

      getTargetType: function() {
        return Person;
      },

      // summary:
      //    The widget for the Person.name in the widget
      txtName: null

    });

  }
);
