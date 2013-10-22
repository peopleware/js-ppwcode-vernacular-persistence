define(["dojo/_base/declare", "dojo/dom-style",
        "dijit/layout/LayoutContainer", "../_PersistentObjectEditPane", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
        "dojo/text!./PersistentObjectButtonEditPane.html", "dojo/i18n!./nls/labels",
        "ppwcode-vernacular-persistence/PersistentObject", "ppwcode-vernacular-persistence/AuditableObject",
        "ppwcode-util-oddsAndEnds/log/logger!",

         "dijit/layout/ContentPane",
        "ppwcode-vernacular-persistence/ui/auditableInfoPane/AuditableInfoPane",
        "dijit/form/Button",
        "xstyle/css!./PersistentObjectButtonEditPane.css"],
    function(declare, domStyle,
             LayoutContainer, _PersistentObjectEditPane, _TemplatedMixin, _WidgetsInTemplateMixin,
             template, labels,
             PersistentObject, AuditableObject,
             logger) {

      function setVisible(/*Button*/ button, /*Boolean*/ condition, /*Boolean*/ busy) {
        // IDEA use FX
        if (button && button.domNode) {
          var displayStyle = condition ? "inline-block" : "none";
          domStyle.set(button.domNode, "display", displayStyle);
          button.set("disabled", !condition || busy);
        }
        // TODO should listen to editable and deletable
      }

      return declare([LayoutContainer, _PersistentObjectEditPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
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
        //    set("contentPane").
        //    If this contentPane has a css width, it is copied to this when set.

        templateString: template,
        labels: labels,

        design: "headline",

        getTargetType: function() {
          // summary:
          //    PersistentObject if there is no persistentObjectDetail. The target type of
          //    the persistentObjectPane otherwise.
          return this.persistentObjectPane ? this.persistentObjectPane.getTargetType() : PersistentObject;
        },

        // persistentObjectPane: ppwcode/semantics/_SemanticObjectPane
        //    An _SemanticObjectPane that displays the target.
        persistentObjectPane: null,

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
            if (this.opener) {
              this.get("persistentObjectPane").set("opener", this.opener);
            }
          }
          var ao = po && po.isInstanceOf(AuditableObject) ? po : null;
          // MUDO invisible if there is no target
          this._auditableInfo.set("target", ao);
        },

        _setOpenerAttr: function(opener) {
          this.opener = opener;
          if (this.get("persistentObjectPane")) {
            this.get("persistentObjectPane").set("opener", this.opener);
          }
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
            var poPaneWidth = domStyle.get(poPane.domNode, "width");
            if (!poPaneWidth) {
              logger.info("poPane has no width set.");
            }
            else {
              poPaneWidth = (poPaneWidth + 16) + "px"; // see css: 16px padding
              domStyle.set(this.domNode, "width", poPaneWidth);
            }
            this._contentDiv.addChild(poPane);
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
          setVisible(this._btnEdit, stylePresentationMode === this.VIEW && (po.get("editable") || po.get("deletable")), false);
          setVisible(this._btnCancel, this.isInEditMode(), busy);
          setVisible(this._btnDelete, this.isInEditMode() && po.get("deletable"), busy);
          setVisible(this._btnSave, this.isInEditMode() && po.get("editable"), busy);
        },

        _localPresentationModeChange: function(presentationMode) {
          this._setButtonsStyles(this.get("stylePresentationMode"));
        }

      });

    });
