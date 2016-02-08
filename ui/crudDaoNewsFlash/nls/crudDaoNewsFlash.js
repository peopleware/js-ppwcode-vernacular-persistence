define({
  root:{
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

    "ppwcode-vernacular-persistence/ObjectAlreadyChangedException":
      "<p><span class='objectLabel'>${this.subject.getLabel({formatLength: 'long', locale: 'nl'})}$</span> is " +
      "ondertussen reeds in een ander venster of door een andere gebruiker aangepast.</p>" +
      "<p>Bekijk of uw wijzigingen nog nodig zijn, en herhaal ze indien nodig.</p>",

    "ppwcode-vernacular-exceptions/SemanticException[NOT UNIQUE]":
      "<p>Een waarde voor " +
      "<span class='objectLabel'>${this.subject.getLabel({formatLength: 'long', locale: 'nl'})}$</span> die uniek moet " +
      "zijn, is niet uniek.</p>" +
      "<p>Pas de gegevens aan, en probeer opnieuw.</p>",

    "ppwcode-vernacular-exceptions/SemanticException":
      "<p>De ingevulde waarden voor " +
      "<span class='objectLabel'>${this.subject.getLabel({formatLength: 'long', locale: 'nl'})}$</span> worden door " +
      "de server niet aanvaard.</p>" +
      "<p>(<code>${(this.exception.key ? this.exception.key : '') + (this.exception.cause ? JSON.stringify(this.exception.cause) : '')}$</code>)</p>" +
      "<p>Pas de gegevens aan, en probeer opnieuw.</p>",

    "ppwcode-vernacular-exceptions/SecurityException":
      "De gevraagde gegevens zijn voor u niet toegankelijk.",

    "error":
      "<p>Er heeft zich een onverwachte situatie voorgedaan. We verontschuldigen ons, maar uw laatste wijzigingen " +
      "zijn niet opgeslagen.</p>" +
      "<p>Herlaad de pagina, en probeer opnieuw.</p>" +
      "<p>Indien de fout zich blijft herhalen, kan u ons contacteren.</p>" +
      "<pre>(${this.exception.message || this.exception.toString()}$)</pre>"
  }
});
