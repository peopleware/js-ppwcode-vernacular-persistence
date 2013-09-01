define(["dojo/_base/declare", "ppwcode-vernacular-semantics/ui/_semanticObjectPane/_SemanticObjectPane",
        "../PersistentObject"],
  function(declare, _SemanticObjectPane,
           PersistentObject) {

    var _PersistentObjectEditPane = declare([_SemanticObjectPane], {
      // summary:
      //   Widget that represents a PersistentObject in detail, and that gives the opportunity
      //   to the user the view the details, edit the details, and create a new object.
      //   This widget adds the control for create, update, delete and refresh, without
      //   defining a representation. Methods are offered to bind to buttons or some other
      //   means to cycle through the presentationModes.
      //   Abstract class to be extended for particular subtypes of PersistentObject.
      // description:
      //   This is done for PersistenceObjects, and not SemanticObjects, because this
      //   has to do with persistence, and is not possible without it.
      //
      //   A normal use would be to have a tree of nested _SemanticObjectPane's, where
      //   the outermost is a _PersistentObjectEditPane (or probably a subclass).
      //   It is most often only at the outermost level that user interaction for
      //   the presentationMode is needed. The targets of nested panes are most often
      //   the same object, with nested panes offering support for more general types,
      //   and more nested panes extending them for subtypes, or objects "owned" by the
      //   target of the outermost pane. Most often it is the target
      //   of the outermost pane that is updated, created or deleted, with possible
      //   cascade (elsewhere) to the owned objects.

      _c_invar: [
        // no extra invariants
      ],

      getTargetType: function() {
        return PersistentObject;
      },

      // _targetStateBeforeEdit: Object
      //   Here we store the target.toJSON when we go to edit mode. We can restore
      //   the original state with a reload from this data on cancel.
      // tags:
      //   private
      _targetStateBeforeEdit: null,

      // refresher: Function
      //   Function that attempts a refresh of a PersistentObject.
      //   Returns a promise. Optional.
      refresher: null,

      // saver: Function
      //   Function that attempts a persistent save of a PersistentObject.
      //   Returns a promise. Optional.
      //   Called by `save` if target has a `persistenceId`.
      saver: null,

      // creator: Function
      //   Function that attempts a persistent create of a PersistentObject.
      //   Returns a promise. Optional.
      //   Called by `save` if target has no `persistenceId`.
      creator: null,

      // remover: Function
      //   Function that attempts a persistent delete of a PersistentObject.
      //   Returns a promise. Optional.
      //   Called by remove.
      remover: null,

      // closer: Function
      //   Function that closes this "window" or "pane". Void.
      //   Must destroy this (i.e., call `destroyRecursive`). Mandatory.
      //   Could be bound to a close button.
      closer: null,

      // TODO validate should be setup here, or in _SemanticObjectPane

      edit: function() {
        // summary:
        //   Go to edit mode EDIT.
        //   We remember the state of `target` before this operation,
        //   so we can reset it on `cancel`.

        this._c_pre(function() {return this.get("target")});
        this._c_pre(function() {return this.get("target").isEditable() || this.get("target").isDeletable();});

        this._targetStateBeforeEdit = this.get("target").toJSON();
        this.set("presentationMode", this.EDIT);
      },

      cancel: function() {
        // summary:
        //   Cancel the current presentation mode.
        //   - When cancelling an edit for an update (`target.persistenceId != null`), revert the target
        //     to its old state, and refresh with refresher. Edit mode reverts to VIEW.
        //   - When cancelling an edit for a create (`target.persistenceId == null`),
        //     call the closer.

        this._c_pre(function() {return this.get("target");});
        this._c_pre(function() {return this.get("refresher");});
        this._c_pre(function() {return this.get("closer");});

        var po = this.get("target");
        if (po.get("persistenceId")) {
          // update of existing object
          po.reload(this._targetStateBeforeEdit);
          var refresher = this.get("refresher");
          if (refresher) {
            var refreshPromise = refresher(po);
            refreshPromise.then(
              function(result) {
                // NOP
              },
              function(e) {
                // this is not really a fatal error, but an inconvenience
                console.warn("ERROR ON REFRESH: " + e);
              }
            );
          }
        }
        this._targetStateBeforeEdit = null;
        this.set("presentationMode", this.VIEW);
        if (!po.get("persistenceId")) {
          // create of new object
          // cancel of creation === close of window
          var closer = this.get("closer");
          closer();
        }
      },

      save: function() {
        // summary:
        //   Save or create the target with saver or creator. On success, we revert to edit mode VIEW.
        //   Save is asynchronous, and can take a while. In the mean time, the
        //   widget accepts no user input (BUSY).
        // description:
        //   If the target has no persistenceId, we use creator. If it has, we use saver.
        //   If a semantic exception is returned by saver or creator, we go to
        //   WILD mode, show the exceptions, and give the user the opportunity
        //   to change the data, and try again (or cancel).
        //   If an error occurs, we go to ERROR mode. The application should
        //   be closed.

        this._c_pre(function() {return this.get("target");});
        this._c_pre(function() {return this.get("target").isEditable();});
        this._c_pre(function() {return this.get("target").get("persistenceId") ? this.get("saver") : true;});
        this._c_pre(function() {return !this.get("target").get("persistenceId") ? this.get("creator") : true;});

        this.set("presentationMode", this.BUSY);
        // TODO local validation
        var po = this.get("target");
        var persisterName = po.get("persistenceId") ? "saver" : "creator";
        var persister = this.get(persisterName);
        // MUDO: delay for demo - REMOVE
        po.waitMillis = 2000;
        var persistPromise = persister(po);
        var thisObject = this;
        persistPromise.then(
          function(result) {
            thisObject.set("presentationMode", thisObject.VIEW);
          },
          function(e) {
            // MUDO triage e
            console.error("ERROR ON SAVE or CREATE: TODO");
            thisObject.set("presentationMode", thisObject.ERROR);
            alert(e);
            throw e;
          }
        )
      },

      remove: function() {
        // summary:
        //    Delete the target with remover. On success, we call closer, which should
        //    close and destroy us.
        //    Remove is asynchronous, and can take a while. In the mean time, the
        //    widget accepts no user input.

        this._c_pre(function() {return this.get("target");});
        this._c_pre(function() {return this.get("target").isDeletable();});
        this._c_pre(function() {return this.get("remover");});
        this._c_pre(function() {return this.get("closer");});

        this.set("presentationMode", this.BUSY);
        var po = this.get("target");
        var deleter = this.get("remover");
        // MUDO: delay for demo - REMOVE
        po.waitMillis = 2000;
        var deletePromise = deleter(po);
        var thisObject = this;
        deletePromise.then(
          function(result) {
            thisObject.set("presentationMode", thisObject.VIEW);
            var closer = thisObject.get("closer");
            closer();
          },
          function(e) {
            // MUDO triage e
            console.error("ERROR ON SAVE or CREATE: TODO");
            thisObject.set("presentationMode", thisObject.ERROR);
            alert(e);
            throw e;
          }
        )
      }

    });

    return _PersistentObjectEditPane; // return _PersistentObjectEditPane

  }
);


