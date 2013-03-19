define(["dojo/_base/declare", "./Person"],
    function (declare, Person) {

      var Child = declare([Person], {

        persistenceType: "Child",

        parent: null,

        reload: function(json) {
          this._c_pre(function() {return json;});
          this._c_pre(function() {return !json.parent || (json.parent.isInstanceOf && json.parent.isInstanceOf(Person));});

          this.parent = json.parent;
        }
      });

      return Child;

    }
);
