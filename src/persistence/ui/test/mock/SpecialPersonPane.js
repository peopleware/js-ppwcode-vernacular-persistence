define(["dojo/_base/declare",
        "ppwcode.semantics/ui/_semanticObjectPane/_SemanticObjectPane", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
        "../../../test/mock/SpecialPerson",
        "dojo/text!./templates/SpecialPersonPane.html", "dojo/i18n!./nls/SpecialPerson",
        "./PersonPane", "dijit/form/ValidationTextBox", "dojox/mvc/at",
        "xstyle/css!ppwcode.semantics/ui/_semanticObjectPane/formCommons.css"],
  function(declare,
           _SemanticObjectPane, _TemplatedMixin, _WidgetsInTemplateMixin,
           SpecialPerson,
           template, labels) {

    return declare([_SemanticObjectPane, _TemplatedMixin, _WidgetsInTemplateMixin], {

      templateString: template,
      labels: labels,

      getTargetType: function() {
        return SpecialPerson;
      },

      // summary:
      //    The widget for the SpecialPerson.email in the widget
      txtEmail: null,

      // summary
      //    The widget for the superclass, Person
      _personPane: null,

      _wrappedDetails: function() {
        return [this._personPane];
      },

      _propagateTarget: function(/*SpecialPerson*/ sp) {
        this._personPane.set("target", sp);
      }

    });

  });
