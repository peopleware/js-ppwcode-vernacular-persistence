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
        "ppwcode-vernacular-semantics/ui/_semanticObjectPane/_SemanticObjectPane", "dijit/_TemplatedMixin", "dijit/_WidgetsInTemplateMixin",
        "../../../test/mock/Person",
        "dojo/text!./templates/PersonPane.html", "dojo/i18n!./nls/Person",
        "dijit/form/ValidationTextBox", "dojox/mvc/at",
        "xstyle/css!ppwcode-vernacular-semantics/ui/_semanticObjectPane/formCommons.css"],
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
