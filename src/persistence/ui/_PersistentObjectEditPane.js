/*
 Copyright 2012 - $Date $ by PeopleWare n.v.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

define(["dojo/_base/declare", "dojo/_base/lang", "ppwcode-vernacular-semantics/ui/_semanticObjectPane/_SemanticObjectPane", "ppwcode-util-oddsAndEnds/_PropagationMixin",
        "ppwcode-vernacular-exceptions/SemanticException", "../IdNotFoundException", "../ObjectAlreadyChangedException", "ppwcode-vernacular-exceptions/SecurityException",
        "../PersistentObject", "dijit/registry", "dijit/form/TextBox", "dojo/Deferred",
        "dojo/i18n!./nls/messages",
        "ppwcode-util-oddsAndEnds/log/logger!",
        "module"],
  function(declare, lang, _SemanticObjectPane, _PropagationMixin,
           SemanticException, IdNotFoundException, ObjectAlreadyChangedException, SecurityException,
           PersistentObject, registry, TextBox, Deferred,
           messages,
           logger,
           module) {

    var _PersistentObjectEditPane = declare([_SemanticObjectPane, _PropagationMixin], {
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

      "-propagate-": {
        presentationMode: [{path: "_focusOnFirstActiveTextBox", exec: true}]
      },

      getTargetType: function() {
        return PersistentObject;
      },

      // crudDao: CrudDao
      //   Needed for operation.
      crudDao: null,

      constructor: function(kwargs) {
        var self = this;
        if (kwargs && kwargs.crudDao) {
          self.crudDao = kwargs.crudDao;
        }
        self.own(self.watch("target", function(propertyName, oldTarget, newTarget) {
          if (self.crudDao) {
            if (oldTarget !== newTarget) {
              if (oldTarget && oldTarget.get("persistenceId")) {
                self.crudDao.stopTracking(oldTarget, self);
              }
              if (newTarget && newTarget.get("persistenceId")) {
                self.crudDao.track(newTarget, self);
              }
            }
          }
        }));
      },

      // TODO validate should be setup here, or in _SemanticObjectPane

      close: function() {
        // summary:
        //   Close this pane.
        //   This may or may not destroy the pane. In some uses,
        //   it is merely hidden to be reused. Subclasses should
        //   decide.
        //   Could be bound to a close button.
        //   Closing might take time. Returns a Promise that resolves
        //   to the `target`.
        // description:
        //   This implementation stops tracking the target,
        //   if there is one.
        this._c_pre(function() {return this.get("crudDao");});

        var self = this;
        var po = self.get("target");
        if (po) {
          self.crudDao.stopTracking(po, self);
        }
        return new Deferred().resolve(po); // returns the promise
      },

      edit: function() {
        // summary:
        //   Go to edit mode EDIT.
        //   We remember the state of `target` before this operation,
        //   so we can reset it on `cancel`.

        this._c_pre(function() {return this.get("target")});
        this._c_pre(function() {return this.get("target").get("editable") || this.get("target").get("deletable");});

        this.set("presentationMode", this.EDIT);
      },

      refresh: function(po, force) {
        // summary:
        //   Function that attempts a refresh of a PersistentObject.
        //   Returns a promise.
        //   The second parameter is a boolean, that, when true, forces the refresh.
        //   With false, only stale cache entries are actually refreshed.
        this._c_pre(function() {return this.get("crudDao");});

        return this.crudDao.retrieve(po.getTypeDescription(), po.get("persistenceId"), this, force);
      },

      cancel: function() {
        // summary:
        //   Cancel the current presentation mode.
        //   - When cancelling an edit for an update (`target.persistenceId != null`), revert the target
        //     to its old state, and refresh. Edit mode reverts to VIEW.
        //   - When cancelling an edit for a create (`target.persistenceId == null`),
        //     close.

        this._c_pre(function() {return this.get("target");});
        this._c_pre(function() {return this.get("crudDao");});

        var self = this;
        var po = self.get("target");
        if (!po || !po.get("persistenceId")) {
          return self.close();
        }
        self.set("presentationMode", self.BUSY);
        if (this.get("focused")) {
          // We are in the active stack. Take the focus away from any internal field:
          // this avoids the focus being ripped away from this completely.
          this.focus();
        }
        var refreshPromise = self.refresh(po, true);
        return refreshPromise.then(
          function(result) {
            self.set("presentationMode", self.VIEW);
            return result;
          },
          function(e) {
            // this is not really a fatal error, but an inconvenience
            if (e.isInstanceOf && (e.isInstanceOf(IdNotFoundException) || e.isInstanceOf(SecurityException))) {
              self.set("presentationMode", self.WILD);
              var messageKey = e.constructor.mid;
              if (e.key) {
                messageKey += "_" + e.key;
              }
              var message = messages[messageKey] || messageKey;
              alert(message);
              return self.close();
            }
            logger.error("ERROR ON REFRESH: " + e);
            self.set("presentationMode", self.ERROR);
            alert(e);
            throw e;
          }
        );
      },

      _saver: function(po) {
        // summary:
        //   Function that attempts a persistent save of a PersistentObject.
        //   Returns a promise. Optional.
        //   Called by `save` if target has a `persistenceId`.
        this._c_pre(function() {return po;});
        this._c_pre(function() {return po.get("persistenceId");});
        this._c_pre(function() {return this.get("crudDao");});

        return this.crudDao.update(po);
      },

      _creator: function(po) {
        // summary:
        //   Function that attempts a persistent create of a PersistentObject.
        //   Returns a promise. Optional.
        //   Called by `save` if target has no `persistenceId`.
        this._c_pre(function() {return po;});
        this._c_pre(function() {return !po.get("persistenceId");});
        this._c_pre(function() {return this.get("crudDao");});

        return this.crudDao.create(po, this);
      },

      save: function() {
        // summary:
        //   Save or create the target. On success, we revert to edit mode VIEW.
        //   Save is asynchronous, and can take a while. In the mean time, the
        //   widget accepts no user input (BUSY).
        // description:
        //   If the target has no persistenceId, we create. If it has, we save.
        //   If a semantic exception is returned by save or create, we go to
        //   WILD mode, show the exceptions, and give the user the opportunity
        //   to change the data, and try again (or cancel).
        //   If an error occurs, we go to ERROR mode. The application should
        //   be closed.
        //   The target does not have to be `editable`. Otherwise, we could not
        //   do state changes that make objects editable.

        this._c_pre(function() {return this.get("target");});
        this._c_pre(function() {return this.get("crudDao");});

        var self = this;
        var po = self.get("target");
        var wildExceptions = po && po.get("wildExceptions");
        if (wildExceptions && wildExceptions.isEmpty()) {
          self.set("presentationMode", this.BUSY);
          var persisterName = po.get("persistenceId") ? "_saver" : "_creator";
          var persister = self.get(persisterName);
          if (this.get("focused")) {
            // We are in the active stack. Take the focus away from any internal field:
            // this avoids the focus being ripped away from this completely.
            this.focus();
          }
          var persistPromise = persister.call(self, po);
          return persistPromise.then(
            function(result) {
              if (persisterName === "_saver") {
                if (result !== po) {
                  throw "ERROR: revive should have found the same object";
                }
                // MUDO workaround https://projects.peopleware.be/jira44/browse/PICTOPERFECT-505
                // The server PUT result is not correct! We retrieve extra, to get the correct result for now!
                return self.cancel(); // yes, weird, but it does the trick for now for the workaround
              }
              if (persisterName === "_creator") {
                // we need to switch the old target with the result
                self.set("target", result);
                self.set("presentationMode", self.VIEW);
              }
              return result;
            },
            function(exc) {
              return self._handleSaveException(exc);
            }
          );
        }
        else {
          return null;
        }
      },

      remove: function() {
        // summary:
        //    Delete the target. On success, we call close, which should
        //    close and destroy us.
        //    Remove is asynchronous, and can take a while. In the mean time, the
        //    widget accepts no user input.
        this._c_pre(function() {return this.get("target");});
        this._c_pre(function() {return this.get("target").get("deletable");});
        this._c_pre(function() {return this.get("crudDao");});

        var self = this;
        this.set("presentationMode", this.BUSY);
        var po = this.get("target");
        var deletePromise = self.crudDao.remove(po);
        return deletePromise.then(
          function() {
            self.set("presentationMode", self.VIEW);
            return self.close();
          },
          function(e) {
            if (e.isInstanceOf && e.isInstanceOf(SemanticException)) {
              if (e.isInstanceOf(IdNotFoundException)) {
                // already gone; no problem
                logger.info("Object was already removed.");
                return self.close();
              }
              self.set("presentationMode", self.WILD);
              var messageKey = e.constructor.mid;
              if (e.key) {
                messageKey += "_" + e.key;
              }
              var message = messages[messageKey] || messageKey;
              alert(message);
              return self.cancel();
            }
            logger.error("ERROR ON SAVE or CREATE: TODO");
            self.set("presentationMode", self.ERROR);
            alert(e);
            return self.cancel();
          }
        );
      },

      _focusOnFirstActiveTextBox: function(presentationMode) {
        var self = this;
        if (presentationMode === self.EDIT) {
          // now focus on the first active focusable widget inside
          function recursiveChildWidgets(domNode) {
            // TODO C/P from ppwcode/vernacular/semantics/ui/_SemanticObjectPane; generalize somewhere
            return registry.findWidgets(domNode).reduce(
              function(acc, w) {
                acc.push(w);
                return acc.concat(recursiveChildWidgets(w.domNode));
              },
              []
            );
          }

          var childWidgets = recursiveChildWidgets(self.domNode);
          var activeInputs = childWidgets.filter(function(w) {return w.isInstanceOf(TextBox) && w.isFocusable && w.isFocusable() && !w.get("readOnly");});
          if (activeInputs.length > 0) {
            activeInputs[0].focus();
          }
        }
      },

      _handleSaveException: function(exc) {
        if (exc.isInstanceOf && exc.isInstanceOf(SemanticException)) {
          this.set("presentationMode", this.WILD);
          var messageKey = exc.constructor.mid;
          if (exc.key) {
            messageKey += "_" + exc.key;
          }
          var message = messages[messageKey] || messageKey;
          alert(message);
          if (exc.isInstanceOf(ObjectAlreadyChangedException) || exc.isInstanceOf(SecurityException)) {
            return this.cancel();
          }
          if (exc.isInstanceOf(IdNotFoundException)) {
            return this.close();
          }
          // else other semantic exception; we are wild
          return this.get("target");
        }
        logger.error("ERROR ON SAVE or CREATE");
        this.set("presentationMode", this.ERROR);
        alert(exc);
        return this.cancel();
      },

      focus: function() {
        // summary:
        //   Focus on the first active text box when in Edit mode.
        //   Otherwise, just focus on this.

        var presentationMode = this.get("presentationMode");
        if (presentationMode !== this.EDIT) {
          this.inherited(arguments);
        }
        else {
          this._focusOnFirstActiveTextBox(presentationMode);
        }
      }

    });

    _PersistentObjectEditPane.mid = module.id;
    return _PersistentObjectEditPane; // return _PersistentObjectEditPane

  }
);


