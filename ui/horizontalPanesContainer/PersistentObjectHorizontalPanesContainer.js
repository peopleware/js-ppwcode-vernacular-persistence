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

define(["dojo/_base/declare", "ppwcode-util-oddsAndEnds/ui/horizontalPanesContainer/HorizontalPanesContainer",
        "ppwcode-vernacular-persistence/PersistentObject", "./PersistentObjectDraggableEditPane",
        "dojo/dom-class",
        "ppwcode-vernacular-persistence/ui/persistentObjectButtonEditPane/PersistentObjectButtonEditPane",
        "module"],
    function(declare, HorizontalPanesContainer,
             PersistentObject,
             PersistentObjectDraggableEditPane,
             domClass,
             PersistentObjectButtonEditPane,
             module) {

      var PersistentObjectHorizontalPanesContainer = declare([HorizontalPanesContainer], {
        // summary:
        //   The objects for which DraggablePanes are opened are PersistentObjects, and each opened Pane is
        //   a PersistentObjectDraggableEditPane.
        //   This requires a CrudDao.

        // crudDao: CrudDao
        crudDao: null,

        openPaneFor: function(/*PersistentObject*/ po, /*DraggablePane?*/ after) {
          // summary:
          //   Open a Draggable pane for `object`, to the right of `after`, or at the right end
          //   of this visualization. In any case, object is refreshed if it has a persistenceId.
          this._c_pre(function() {return po;});

          var pane = this.inherited(arguments);
          if (po.get("persistenceId")) {
            pane.refresh(po, false);
          }
          return pane;
        },

        _freshDraggablePaneFor: function(/*PersistentObject*/ po) {
          this._c_pre(function() {return po.isInstanceOf && po.isInstanceOf(PersistentObject);});

          var draggablePane = new PersistentObjectDraggableEditPane({crudDao: this.crudDao});
          var detailPane = new (this._SemanticObjectPaneConstructorFor(po))();
          domClass.add(draggablePane.domNode, this._draggableClassNameFor(po));
          draggablePane.set("persistentObjectPane", detailPane);
          draggablePane.set("target", po);
          return draggablePane;
        },

        _SemanticObjectPaneConstructorFor: function(/*PersistentObject*/ po) {
          // summary:
          //   Return the constructor for a _SemanticObjectPane applicable to represent po.
          this._c_pre(function() {return po;});

          return this._c_ABSTRACT(po);
        },

        _draggableClassNameFor: function(/*PersistentObject*/ po) {
          // summary:
          //   Returns a String CSS class name for a draggable pane that visualizes po.
          //   null by default.
          this._c_pre(function() {return po;});

          return null;
        }

      });

      PersistentObjectHorizontalPanesContainer.mid = module.id;

      return PersistentObjectHorizontalPanesContainer;

    });
