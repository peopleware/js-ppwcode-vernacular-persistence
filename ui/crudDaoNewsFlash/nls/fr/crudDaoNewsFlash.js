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
  "GET":
    "<p>Les valeurs les plus récentes de " +
    "<span class='objectLabel'>${this.getLabel({formatLength: 'long', locale: 'nl'})}$</span> sont chargés.</p>",

  "DELETE":
    "<p><span class='objectLabel'>${this.getLabel({formatLength: 'long', locale: 'nl'})}$</span> est supprimé.</p>" +
    "<p>La fenêtre a été fermée.</p>",

  "POST":
    "<span class='objectLabel'>${this.getLabel({formatLength: 'long', locale: 'nl'})}$</span> a été créée avec succès.",

  "PUT":
    "Les valeurs nouvelles de <span class='objectLabel'>${this.getLabel({formatLength: 'long', locale: 'nl'})}$</span> " +
    "sont enregistrés.",

  "ppwcode-vernacular-persistence/IdNotFoundException":
    "<p><span class='objectLabel'>${this.getLabel({formatLength: 'long', locale: 'nl'})}$</span> n’existe plus.</p>" +
    "<p>La fenêtre a été fermée.</p>",

  "ppwcode-vernacular-persistence/IdNotFoundException/UNKNOWN OBJECT":
    "L’objet demandé n’existe plus.",

  "ppwcode-vernacular-persistence/ObjectAlreadyChangedException":
    "<p><span class='objectLabel'>${this.subjectRepresentation('nl')}$</span> a déjà été modifiée dans une autre " +
    "fenêtre ou par un autre utilisateur.</p>" +
    "<p>Vérifiez votre modifications, et répétez les, si elles sont encore nécessaires.</p>",

  "ppwcode-vernacular-exceptions/SemanticException[NOT UNIQUE]":
    "<p>Une valuer de " +
    "<span class='objectLabel'>${this.subjectRepresentation('nl')}$</span> qui devrait être unique, ne l'est pas." +
    "zijn, is niet uniek.</p>" +
    "<p>Modifiez la valeur, et essayez à nouveau.</p>",

  "ppwcode-vernacular-exceptions/SemanticException":
    "<p>Votre action sur " +
    "<span class='objectLabel'>${this.subjectRepresentation('nl')}$</span> n’est pas acceptée par le serveur.</p>" +
    "<p>(<code>${(this.exception.key ? this.exception.key : '') + (this.exception.cause ? JSON.stringify(this.exception.cause) : '')}$</code>)</p>" +
    "<p>Vous pouvez modifier les données, et essayez à nouveau.</p>",

  "ppwcode-vernacular-exceptions/SecurityException":
    "Les données demandées ne sont pas accessibles pour vous.",

  "error":
    "<p>Une situation imprévue se est produite. Veuillez nous excuser, mais votre dernières modifications ne sont pas " +
    "enregistrés.</p>" +
    "<p>Recharger la page, et essayez à nouveau.</p>" +
    "<p>Si le problème persiste, vous pouvez nous contacter.</p>" +
      "<pre>(${this.exception.message || this.exception.toString()}$)</pre>"
});
