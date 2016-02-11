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
    "<p>De meest recente waarden van " +
    "<span class='objectLabel'>${this.getLabel({formatLength: 'long', locale: 'nl'})}$</span> werden ingeladen.</p>",

  "DELETE":
    "<p><span class='objectLabel'>${this.getLabel({formatLength: 'long', locale: 'nl'})}$</span> is verwijderd.</p>" +
    "<p>Het venster werd gesloten.</p>",

  "POST":
    "<span class='objectLabel'>${this.getLabel({formatLength: 'long', locale: 'nl'})}$</span> is succesvol " +
    "aangemaakt.",

  "PUT":
    "De nieuwe waarden voor <span class='objectLabel'>${this.getLabel({formatLength: 'long', locale: 'nl'})}$</span> " +
    "zijn opgeslagen.",

  "ppwcode-vernacular-persistence/IdNotFoundException":
    "<p><span class='objectLabel'>${this.getLabel({formatLength: 'long', locale: 'nl'})}$</span> bestaat niet " +
    "meer.</p>" +
    "<p>Het venster werd gesloten.</p>",

  "ppwcode-vernacular-persistence/IdNotFoundException/UNKNOWN OBJECT":
    "Het gevraagde object bestaat niet meer.",

  "ppwcode-vernacular-persistence/ObjectAlreadyChangedException":
    "<p><span class='objectLabel'>${this.subjectRepresentation('nl')}$</span> is " +
    "ondertussen reeds in een ander venster of door een andere gebruiker aangepast.</p>" +
    "<p>Bekijk of uw wijzigingen nog nodig zijn, en herhaal ze indien nodig.</p>",

  "ppwcode-vernacular-exceptions/SemanticException[NOT UNIQUE]":
    "<p>Een waarde voor " +
    "<span class='objectLabel'>${this.subjectRepresentation('nl')}$</span> die uniek moet " +
    "zijn, is niet uniek.</p>" +
    "<p>Pas de gegevens aan, en probeer opnieuw.</p>",

  "ppwcode-vernacular-exceptions/SemanticException":
    "<p>Uw actie op " +
    "<span class='objectLabel'>${this.subjectRepresentation('nl')}$</span> wordt door " +
    "de server niet aanvaard.</p>" +
    "<p>(<code>${(this.exception.key ? this.exception.key : '') + (this.exception.cause ? JSON.stringify(this.exception.cause) : '')}$</code>)</p>" +
    "<p>Pas eventueel de gegevens aan, en probeer opnieuw.</p>",

  "ppwcode-vernacular-exceptions/SecurityException":
    "De gevraagde gegevens zijn voor u niet toegankelijk.",

  "error":
    "<p>Er heeft zich een onverwachte situatie voorgedaan. We verontschuldigen ons, maar uw laatste wijzigingen " +
    "zijn niet opgeslagen.</p>" +
    "<p>Herlaad de pagina, en probeer opnieuw.</p>" +
    "<p>Indien de fout zich blijft herhalen, kan u ons contacteren.</p>" +
      "<pre>(${this.exception.message || this.exception.toString()}$)</pre>"
});
