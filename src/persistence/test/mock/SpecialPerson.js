define(["ppwcode/semantics/ui/test/mock/mockGenerator", "./Person"],
    function (generator, Person) {

      var SpecialPerson = generator.specialPersonClass(Person);
      SpecialPerson.prototype.persistenceType = "SPECIAL PERSON";
      return SpecialPerson;

    }
);
