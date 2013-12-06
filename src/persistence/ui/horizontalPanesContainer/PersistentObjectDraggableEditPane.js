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
        "dojo/dom-style", "dojo/keys",

        "dojo/text!./persistentObjectDraggableEditPane.html",

        "module",

        "dijit/layout/LayoutContainer", "dijit/layout/ContentPane",
        "dojo/_base/lang", "dojox/mvc/at",
        "dojox/mobile/Heading", "dojox/mobile/ToolBarButton",
        "dojox/mobile/Tooltip", "dojox/mobile/Button",
        "xstyle/css!./persistentObjectDraggableEditPane.css"],
    function(declare,
             DraggablePane, PersistentObjectButtonEditPane,
             domStyle, keys,
             template,
             module) {

      var PersistentObjectDraggableEditPane = declare([PersistentObjectButtonEditPane, DraggablePane], {
        // summary:
        //   A PersistentObjectDraggableEditPane is a PersistentObjectButtonEditPane with a different template.

        templateString: template,

        // crudDao: CrudDao
        //   Needed for operation.
        crudDao: null,

        constructor: function(kwargs) {
          var self = this;
          if (kwargs && kwargs.crudDao) {
            self.crudDao = kwargs.crudDao;
          }
          self.own(self.watch("target", function(propertyName, oldTarget, newTarget) {
            if (oldTarget !== newTarget) {
              if (oldTarget && oldTarget.get("persistenceId")) {
                self.crudDao.stopTracking(oldTarget, self);
              }
              if (newTarget && newTarget.get("persistenceId")) {
                self.crudDao.track(newTarget, self);
              }
            }
          }));
          self.set("opener", function(po) {
            return self.container.openPaneFor(po, /*after*/ self);
          });
          self.set("closer", this.removeFromContainer);
        },

        postCreate: function() {
          this.inherited(arguments);
          var self = this;
          self.own(this.on("keypress", function(event) {
            var presentationMode = self.get("presentationMode");
            if (presentationMode === self.VIEW && event.keyChar === "e") {
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
          self.own(this.on("keydown", function(event) {
            var presentationMode = self.get("presentationMode");
            if ((presentationMode === self.EDIT || presentationMode === self.WILD) &&
                event.keyCode === keys.ESCAPE) {
              event.preventDefault();
              event.stopPropagation();
              self.cancel(event);
            }
            else if ((event.keyCode === keys.LEFT_ARROW || event.keyCode === keys.RIGHT_ARROW) &&
                     (presentationMode === self.VIEW ||
                      presentationMode === self.BUSY ||
                      event.metaKey)){
              event.preventDefault();
              event.stopPropagation();
              if (event.keyCode === keys.LEFT_ARROW && self.previous !== self.getFirst()) {
                self.previous.focus();
              }
              else if (event.keyCode === keys.RIGHT_ARROW && self.next !== self.getLast()) {
                self.next.focus();
              }
              // IDEA: with shift: move left, right
            }
          }));
        },

        isVisualizationOf: function(object) {
          return this.get("target") === object;
        },

        _setCrudDaoAttr: function(crudDao) {
          var self = this;
          self._set("crudDao", crudDao);
          if (crudDao) {
            self.set("refresher", function(po) {
              return crudDao.retrieve(po.getTypeDescription(), po.get("persistenceId"), self, true);
            });
            self.set("saver", function(po) {
              return crudDao.update(po);
            });
            self.set("creator", function(po) {
              return crudDao.create(po, self);
            });
            self.set("remover", function(po) {
              return crudDao.remove(po);
            });
            self.set("closer", function() {
              var target = self.get("target");
              if (target) {
                crudDao.stopTracking(target, self);
              }
              self.removeFromContainer();
            });
          }
          else {
            self.set("refresher",null);
            self.set("saver", null);
            self.set("creator", null);
            self.set("remover", null);
            self.set("closer", this.removeFromContainer);
          }
        },

        _setButtonsStyles: function(stylePresentationMode) {
          this.inherited(arguments);

          this._setVisible(this._btnClose, stylePresentationMode === this.VIEW, stylePresentationMode === this.BUSY);
        },

        close: function() {
          this.closer();
        },

        cancel: function(event) {
          return this._closeOnAlt(event, this.inherited(arguments));
        },

        save: function(event) {
          return this._closeOnAlt(event, this.inherited(arguments));
        },

        remove: function() {
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
              self.removeFromContainer();
              return result;
            },
            function(err) {
              throw err;
            }
          );
        }

      });

      PersistentObjectDraggableEditPane.mid = module.id;

      return PersistentObjectDraggableEditPane;

    });
