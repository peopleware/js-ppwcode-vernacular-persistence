define(["ppwcode/semantics/ui/test/mock/mockGenerator", "../../PersistentObject"],
    function (generator, PersistentObject) {

      var Person = generator.personClass(PersistentObject);
      Person.prototype.persistenceType = "PERSON";
      return Person;

    }
);
