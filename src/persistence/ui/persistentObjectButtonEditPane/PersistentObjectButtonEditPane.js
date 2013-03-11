define(["dojo/_base/declare", "dijit/registry", "dojo/_base/lang", "dojo/dom-style",
        "../_PersistentObjectEditPane", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
        "dojo/text!./PersistentObjectButtonEditPane.html", "dojo/i18n!./nls/labels",
        "ppwcode/persistence/PersistentObject", "ppwcode/persistence/AuditableObject",
        "dijit/layout/BorderContainer", "dijit/layout/ContentPane",
        "ppwcode/persistence/ui/auditableInfoPane/AuditableInfoPane",
        "dijit/form/Button",
        "xstyle/css!./PersistentObjectButtonEditPane.css"],
    function(declare, registry, lang, domStyle,
             _PersistentObjectEditPane, _TemplatedMixin, _WidgetsInTemplateMixin,
             template, labels,
             PersistentObject, AuditableObject) {

      function setVisible(/*Button*/ button, /*Boolean*/ condition, /*Boolean*/ busy) {
        // IDEA use FX
        var displayStyle = condition ? "inline-block" : "none";
        domStyle.set(button.domNode, "display", displayStyle);
        button.set("disabled", !condition || busy);

        // TODO should listen to isEditable and isDeletable
      }

      return declare([_PersistentObjectEditPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
        // summary:
        //    Widget that extends _PersistentObjectEditPane with an actual presentation.
        //    There are buttons to control the edit cycle on the bottom of the pane.
        //    The content will show a scrollbar if it is to high or wide.
        // description:
        //    This is a ./_PersistentObjectEditPane.
        //    The widget shows buttons to go the edit mode, cancel or save an edit,
        //    and delete the persistent object.
        //    The actual actions are done by a refresher, creator, saver, and remover
        //    function.
        //    Intended to wrap around a _SemanticObjectPane, which can be injected with
        //    set("contentPane")

        templateString: template,
        labels: labels,

        getTargetType: function() {
          // summary:
          //    PersistentObject if there is no persistentObjectDetail. The target type of
          //    the persistentObjectPane otherwise.
          return this.persistentObjectPane ? this.persistentObjectPane.getTargetType() : PersistentObject;
        },

        // persistentObjectPane: ppwcode/semantics/_SemanticObjectPane
        //    An _SemanticObjectPane that displays the target.
        persistentObjectPane: null,

        _borderContainer: null,
        _contentDiv: null,
        _errorDiv: null,
        _bottomDiv: null,
        _auditableInfo: null,
        _buttonDiv: null,
        _btnEdit: null,
        _btnCancel: null,
        _btnSave: null,
        _btnDelete: null,

        postCreate: function() {
          this._setButtonsStyles(this.NOTARGET);
          if (! this.get("target")) { // TODO is this really necessary? why? write a comment
            this.set("target", null);
          }
        },

        destroy: function() {
          this._beingDestroyed = true;
          this.set("target", null);
          // will also destroy _auditableInfo, if there still is one
          this.inherited(arguments);
        },

        _wrappedDetails: function() {
          var result = [];
          if (this.persistentObjectPane) {
            result.push(this.persistentObjectPane);
          }
          result.push(this._auditableInfo);
          return result;
        },

        _propagateTarget: function(/*PersistentObject*/ po) {
          // summary:
          //    Set the target on the persistentObjectPane and _auditableInfo
          if (this.get("persistentObjectPane")) {
            this.get("persistentObjectPane").set("target", po);
          }
          var ao = po && po.isInstanceOf(AuditableObject) ? po : null;
          // MUDO invisible if there is no target
          this._auditableInfo.set("target", ao);
        },

        _setPersistentObjectPaneAttr: function(poPane) {
          // summary:
          //    Set the persistentObjectPane. If it has a target, and we have no target,
          //    that becomes are new target.
          // description:
          //    Note that the old persistentObjectPane was not created by us,
          //    and thus also is not destroyed by us!

          // TODO poDetail target type is a PersistentObject

          // might be called implicity by constructor of WidgetBase
          var oldPoPane = this.get("persistentObjectPane");
          if (oldPoPane) {
            oldPoPane.set("target", null);
            // no destroy of oldPoDetail; we didn't create it; if we do, we have to!
            this._contentDiv.removeChild(oldPoPane);
            oldPoPane.destroyRecursive();
          }
          this._set("persistentObjectPane", poPane);
          if (poPane) {
            this._contentDiv.addChild(poPane);
            this.domNode.style.width = poPane.getWidgetSize() + "px";
            // new detail might already have a target
            var ourPo = this.get("target");
            var wrappedPo = poPane.get("target");
            if (ourPo) {
              poPane.set("target", ourPo);
            }
            else if (wrappedPo) {
              this.set("target", wrappedPo);
            }
            // else we both have null targets; ok
          }
          this.resize();
        },

        validate: function() {
          // MUDO: standard Widget function?
          if (this.get("presentationMode") === this.EDIT) {
            var poPane = this.get("persistentObjectPane");
            if (poPane && poPane.validate) {
              return poPane.validate();
            }
            else {
              return true;
            }
          }
          else {
            return true;
          }
        },

        _setButtonsStyles: function(stylePresentationMode) {
          // Set the button style.
          this._c_pre(function() { return stylePresentationMode && this.stylePresentationModes.indexOf(stylePresentationMode) >= 0; });

          var po = this.get("target");
          var busy = (stylePresentationMode === this.BUSY);
          setVisible(this._btnEdit, stylePresentationMode === this.VIEW && (po.isEditable() || po.isDeletable()), false);
          setVisible(this._btnCancel, this.isInEditMode(), busy);
          setVisible(this._btnDelete, this.isInEditMode() && po.isDeletable(), busy);
          setVisible(this._btnSave, this.isInEditMode() && po.isEditable(), busy);
        },

        _localPresentationModeChange: function(presentationMode) {
          this._setButtonsStyles(this.get("stylePresentationMode"));
        },

        getWidgetSize: function() {
          var poPane = this.get("persistentObjectPane");
          if (poPane) {
            return poPane.getWidgetSize() + 20;
          }
          return 0;
        },

        resize: function() {
          this._borderContainer.resize();
        }

      });

    });
