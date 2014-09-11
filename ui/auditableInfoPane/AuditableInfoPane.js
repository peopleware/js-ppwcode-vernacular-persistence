/*
Copyright 2013 - $Date $ by PeopleWare n.v.

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
        "dojo/text!./AuditableInfoPane.html", "dojo/i18n!./nls/labels",
        "ppwcode-vernacular-persistence/AuditableObject",
        "dojox/mvc/Output", "dojox/mvc/at", "dojo/date/locale",
        "xstyle/css!./AuditableInfoPane.css"],
  function(declare,
           _SemanticObjectPane, _TemplatedMixin, _WidgetsInTemplateMixin,
           template, labels,
           AuditableObject) {

    return declare([_SemanticObjectPane, _TemplatedMixin, _WidgetsInTemplateMixin], {
      // summary:
      //   This widget shows, read-only, the audit information from an `AuditableObject`,
      //   low key.

      templateString: template,
      labels: labels,

      getTargetType: function() {
        return AuditableObject;
      }

    });

  }
);
