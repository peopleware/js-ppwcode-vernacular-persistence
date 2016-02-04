define({
  root:{
    "DELETE":
      "${this.getLabel({formatLength: 'long', locale: 'nl'})}$ is verwijderd. Het venster werd gesloten.",

    "POST":
      "${this.getLabel({formatLength: 'long', locale: 'nl'})}$ is succesvol aangemaakt.",

    "PUT":
      "De nieuwe waarden voor ${this.getLabel({formatLength: 'long', locale: 'nl'})}$ zijn opgeslagen.",

    "ppwcode-vernacular-persistence/IdNotFoundException":
      "${this.getLabel({formatLength: 'long', locale: 'nl'})}$ bestaat niet meer. Het venster werd gesloten.",

    "ppwcode-vernacular-persistence/ObjectAlreadyChangedException":
      "${this.subject.getLabel({formatLength: 'long', locale: 'nl'})}$ is ondertussen reeds in een ander venster " +
      "of door een andere gebruiker aangepast. Bekijk of uw wijzigingen nog nodig zijn, en herhaal ze indien nodig.",

    "ppwcode-vernacular-exceptions/SemanticException[NOT UNIQUE]":
      "Een waarde voor ${this.subject.getLabel({formatLength: 'long', locale: 'nl'})}$ die uniek moet zijn, " +
      "is niet uniek. Pas de gegevens aan, en probeer opnieuw.",

    "ppwcode-vernacular-exceptions/SemanticException":
      "De ingevulde waarden voor ${this.subject.getLabel({formatLength: 'long', locale: 'nl'})}$ worden door de " +
      "server niet aanvaard " + "(${(this.exception.key ? this.exception.key : '') + " +
      "(this.exception.cause ? JSON.stringify(this.exception.cause) : ''}$). Pas de gegevens aan, en probeer opnieuw.",

    "ppwcode-vernacular-exceptions/SecurityException":
      "De gevraagde gegevens zijn voor u niet toegankelijk.",

    "error":
      "Er heeft zich een onverwachte situatie voorgedaan. We verontschuldigen ons, maar uw " +
      "laatste wijzigingen zijn niet opgeslagen. " +
      "Herlaad de pagina, en probeer opnieuw. Indien de fout zich " +
      "blijft herhalen, kan u ons contacteren. (${this.exception.message || this.exception.toString()}$)"
  }
});
