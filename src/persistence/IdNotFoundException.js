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

define(["dojo/_base/declare", "ppwcode-vernacular-exceptions/SemanticException", "module"],
    function(declare, SemanticException, module) {

      var IdNotFoundException = declare([SemanticException], {

        // typeDescription: String?
        //   Description of the type of object we did not find, if possible.
        //   This description is in the lingo of this dojo application.
        typeDescription: null,

        // serverType: String?
        //   Description of the type of object we did not find, if possible.
        //   This description is in the lingo of the server.
        serverType: null,

        // persistenceId: Object?
        //   The persistenceId of the object we did not find, if possible.
        persistenceId: null,

        constructor: function(/*Object*/ props) {
          if (props) {
            if (props.typeDescription) {
              this.typeDescription = props.typeDescription;
            }
            if (props.serverType) {
              this.serverType = props.serverType;
            }
            if (props.persistenceId) {
              this.persistenceId = props.persistenceId;
            }
          }
        }

      });

      IdNotFoundException.mid = module.id;
      return IdNotFoundException;
    }
);
