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

define(["dojo/_base/declare",
        "ppwcode-util-oddsAndEnds/ui/horizontalPanesContainer/DraggablePane",
        "ppwcode-vernacular-persistence/ui/persistentObjectButtonEditPane/PersistentObjectButtonEditPane",
        "dojo/keys", "dojo/Deferred",
        "ppwcode-util-oddsAndEnds/log/logger!",
        "dojo/aspect",

        "dojo/text!./persistentObjectDraggableEditPane.html", "dojo/i18n!./nls/labels",

        "module",

        "dijit/layout/LayoutContainer", "dijit/layout/ContentPane",
        "dojo/_base/lang", "dojox/mvc/at",
        "xstyle/css!./persistentObjectDraggableEditPane.css"],
    function(declare,
             DraggablePane, PersistentObjectButtonEditPane,
             keys, Deferred,
             logger,
             aspect,
             template, labels,
             module) {

      //noinspection LocalVariableNamingConventionJS
      var PersistentObjectDraggableEditPane = declare([PersistentObjectButtonEditPane, DraggablePane], {
        // summary:
        //   A PersistentObjectDraggableEditPane is a PersistentObjectButtonEditPane with a different template.

        templateString: template,
        labels: labels,

        constructor: function(kwargs) {
          var self = this;
          self.set("opener", function(po) {
            return self.container.openPaneFor(po, /*after*/ self);
          });
        },

        postCreate: function() {
          this.inherited(arguments);
          var self = this;
          self.own(self.on("keypress", function(event) {
            var presentationMode = self.get("presentationMode");
            var target = self.get("target");
            if (presentationMode === self.VIEW && event.keyChar === "e" && target && target.get("editable")) {
              event.preventDefault();
              event.stopPropagation();
              self.edit();
            }
            else if (event.keyChar === "w" && presentationMode === self.VIEW) {
              event.preventDefault();
              event.stopPropagation();
              self.close();
            }
            else if ((presentationMode === self.EDIT || presentationMode === self.WILD) &&
                     (event.ctrlKey || event.metaKey) &&
                     (event.keyChar === "s" || (event.keyChar === "w" && event.altKey))) {
              event.preventDefault();
              event.stopPropagation();
              self.save(event);
            }
          }));

          // TODO below function too complex; refactor

          self.own(self.on("keydown", function(event) {
            var presentationMode = self.get("presentationMode");
            if ((presentationMode === self.EDIT || presentationMode === self.DELETE_ONLY || presentationMode === self.WILD) &&
                event.keyCode === keys.ESCAPE) {
              event.preventDefault();
              event.stopPropagation();
              self.cancel(event);
            }
            else if (
                      ((event.keyCode === keys.LEFT_ARROW || event.keyCode === keys.RIGHT_ARROW) &&
                        (presentationMode === self.VIEW || presentationMode === self.BUSY)) ||
                      ((event.keyCode === keys.PAGE_UP || event.keyCode === keys.PAGE_DOWN || event.keyCode === keys.HOME || event.keyCode === keys.END) &&
                        (presentationMode === self.EDIT || presentationMode === self.DELETE_ONLY ||
                         presentationMode === self.WILD || presentationMode === self.VIEW || presentationMode === self.BUSY) &&
                        event.metaKey)
                    ) {
              event.preventDefault();
              event.stopPropagation();
              if ((event.keyCode === keys.LEFT_ARROW || event.keyCode === keys.PAGE_UP) && self.previous !== self.getFirst()) {
                self.previous.focus();
              }
              else if ((event.keyCode === keys.RIGHT_ARROW  || event.keyCode === keys.PAGE_DOWN) && self.next !== self.getLast()) {
                self.next.focus();
              }
              else if (event.keyCode === keys.HOME && self.getFirst().next !== self.getLast()) {
                self.getFirst().next.focus();
              }
              else if (event.keyCode === keys.END && self.getLast().previous !== self.getFirst()) {
                self.getLast().previous.focus();
              }
              // IDEA: with shift: move left, right
            }
          }));
          self.own(aspect.after(
            self._btnDelete,
            "_onDropDownMouseDown",
            function(/*Event*/ e) {
            // we need to stopPropagation, or else the enclosing movable will think we are starting a drag, and it will eat the mouse up
              e.stopPropagation();
            },
            true
          ));
        },

        isVisualizationOf: function(object) {
          return this.get("target") === object;
        },

        _setButtonsStyles: function(stylePresentationMode) {
          this.inherited(arguments);

          this._setVisible(this._btnClose, stylePresentationMode === this.VIEW, stylePresentationMode === this.BUSY);
        },

        cancel: function(event) {
          return this._closeOnAlt(event, this.inherited(arguments));
        },

        save: function(event) {
          return this._closeOnAlt(event, this.inherited(arguments));
        },

        remove: function(event) {
          return this._closeOnAlt(event, this.inherited(arguments));
        },

        _closeOnAlt: function(/*Event*/ event, /*Promise*/ promise) {
          if (!event || !event.altKey) {
            return promise;
          }
          // also close
          var self = this;
          return promise.then(
            function(result) {
              return self.close().then(function() {return result;});
            }
          );
        },

        close: function() {
          // summary:
          //   Close and destroy.

          var self = this;
          var inheritedResult = self.inherited(arguments);
          return inheritedResult.then(
            function(po) {
              var removed = self.removeFromContainer(); // this is destroyed.
              if (removed) {
                return removed.then(function() {
                  return po;
                });
              }
              else {
                return new Deferred().resolve(po); // returns the promise
              }
            }
          );
        }

      });

      PersistentObjectDraggableEditPane.mid = module.id;

      return PersistentObjectDraggableEditPane;

    });
