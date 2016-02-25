/*
 Copyright 2016 - $Date $ by PeopleWare n.v.

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

define({
  root:{
    "GET":
      "<p>The most recent values of " +
      "<span class='objectLabel'>${this.getLabel({formatLength: 'long', locale: 'nl'})}$</span> are loaded.</p>",

    "DELETE":
      "<p><span class='objectLabel'>${this.getLabel({formatLength: 'long', locale: 'nl'})}$</span> is deleted.</p>" +
      "<p>The window was closed.</p>",

    "POST":
      "<span class='objectLabel'>${this.getLabel({formatLength: 'long', locale: 'nl'})}$</span> was successfully " +
      "created.",

    "PUT":
      "The new values for <span class='objectLabel'>${this.getLabel({formatLength: 'long', locale: 'nl'})}$</span> " +
      "are stored.",

    "ppwcode-vernacular-persistence/IdNotFoundException":
      "<p><span class='objectLabel'>${this.getLabel({formatLength: 'long', locale: 'nl'})}$</span> doesn't exist " +
      "anymore.</p>" +
      "<p>The window was closed.</p>",

    "ppwcode-vernacular-persistence/IdNotFoundException/UNKNOWN OBJECT":
      "The requested object doesn't exist anymore.",

    "ppwcode-vernacular-persistence/ObjectAlreadyChangedException":
      "<p><span class='objectLabel'>${this.subjectRepresentation('nl')}$</span> was " +
      "changed already in another window or by another user.</p>" +
      "<p>Review your changes, and repeat them if they are still needed.</p>",

    "ppwcode-vernacular-exceptions/SemanticException[NOT UNIQUE]":
      "<p>A value for " +
      "<span class='objectLabel'>${this.subjectRepresentation('nl')}$</span> that must be unique, isn't.</p>" +
      "<p>Edit the value, and try again.</p>",

    "ppwcode-vernacular-exceptions/SemanticException":
      "<p>Your action on " +
      "<span class='objectLabel'>${this.subjectRepresentation('nl')}$</span> is not accepted by the server.</p>" +
      /* Don't add the exception: the end user can't make anything of this. Look at the console.
      "<p>(<code>${(this.exception.key ? this.exception.key : '') + (this.exception.cause ? JSON.stringify(this.exception.cause) : '')}$</code>)</p>" +
      */
      "<p>You might want to change the data, and try again.</p>",

    "ppwcode-vernacular-exceptions/SecurityException":
      "The requested data is not accessible to you.",

    "error":
      "<p>An unexpected situation has occured. We apologize, but your last changes are not saved.</p>" +
      "<p>Reload the page, and try again.</p>" +
      "<p>If the issue persists, you can contact us.</p>"
      /* Don't add the exception: the end user can't make anything of this. Look at the console.
      "<pre>(${this.exception.message || this.exception.toString()}$)</pre>"
      */
  },
  nl: true,
  fr: true
});
