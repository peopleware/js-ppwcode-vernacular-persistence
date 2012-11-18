define(["dojo/main", "util/doh/main", "contracts/declare"],
  function(dojo, doh, c) {

    var booleanValue = true;
    var stringValue1 = "A property value";
    var stringValue2 = "Another property value";
    var numberValue1 = 3.14;
    var numberValue2 = Math.sqrt(2);
    var arrayValue = ["string value", -88284.994, null, [4, 5, 9], { propInObjectInArray: true}, function() { return true; }];
    var dateValue = new Date();
    var objectValue = { propInObjectinObject: 8 };
    var functionValue = function() {
      // object must have a property "stringProperty"
      return this.stringProperty;
    };
    var functionValuePost = [
      function(result) { return result === this.stringProperty; }
    ];
    var toStringMethod = function() {
      // object must have a method "functionProperty"
      return this.functionProperty();
    };
    var constructor = function() {
      this.stringProperty = stringValue2;
      this.numberProperty =  numberValue2;
    };
    var constructorPost = [
      function() { return this.nullProperty === null; },
      function() { return this.booleanProperty === booleanValue; },
      function() { return this.stringProperty === stringValue2; },
      function() { return this.numberProperty === numberValue2; },
      function() { return this.arrayProperty === arrayValue; },
      function() { return this.dateProperty === dateValue; },
      function() { return this.objectProperty === objectValue; },
      function() { return this.functionProperty === functionValue; },
      function() { return this.toString === toStringMethod; },
      function() { return this.constructor === constructor; },
      function() { return this.oneMoreMethod === functionValue; }
    ];


    function testResultInstanceProperty(resultInstance, propertyName, expectedValuePrototype, expectedValueInstance) {
      var resultPrototype = Object.getPrototypeOf(resultInstance);
      doh.t(resultPrototype.hasOwnProperty(propertyName));
      doh.is(expectedValuePrototype, resultPrototype[propertyName]);
      doh.is(expectedValueInstance, resultInstance[propertyName]);
    }

    function functionIsResultingFunctionFromContractMethod(fcmCandidate) {
      doh.isNot(null, fcmCandidate);
      doh.t(fcmCandidate.hasOwnProperty("pre"));
      doh.t(fcmCandidate.hasOwnProperty("impl"));
      doh.t(fcmCandidate.hasOwnProperty("post"));
      doh.t(fcmCandidate.hasOwnProperty("excp"));
      doh.is(fcmCandidate, fcmCandidate.impl);
    }

    var _objectProto = Object.prototype;
    var _urToStringF = _objectProto.toString;

    function _urToString(o) {
      return _urToStringF.call(o);
    }

    function _isFunction(candidateFunction) {
      return _urToString(candidateFunction) === "[object Function]";
    }

    function _isArray(candidateArray) {
      return _urToString(candidateArray) === "[object Array]";
    }

    function isString(o) {
      return typeof o === "string" || (typeof o === "object" && o.constructor === String);
    }

    doh.register("be/ppwcode/util/contracts/I/declare", [

      function testDoh() {
        console.log("test ran");
      },

      function stringType() {
        var aString = "this is a test string";
        doh.is("string", typeof aString);
        doh.t(isString(aString));
      },

      function testSimpleDeclare() {
        var Result = c.declare(null, {
          nullProperty : null,
          booleanProperty : booleanValue,
          stringProperty : stringValue1,
          numberProperty : numberValue1,
          arrayProperty : arrayValue,
          dateProperty : dateValue,
          objectProperty : objectValue,
          functionProperty : functionValue,
          toString: toStringMethod,
          constructor: constructor
        });
        var resultInstance = new Result();
        doh.is(Result, resultInstance.constructor);
//        doh.is(Object.getPrototypeOf(Result), Object.getPrototypeOf(resultInstance));
        testResultInstanceProperty(resultInstance, "nullProperty", null, null);
        testResultInstanceProperty(resultInstance, "booleanProperty", booleanValue, booleanValue);
        testResultInstanceProperty(resultInstance, "stringProperty", stringValue1, stringValue2);
        testResultInstanceProperty(resultInstance, "numberProperty", numberValue1, numberValue2);
        testResultInstanceProperty(resultInstance, "arrayProperty", arrayValue, arrayValue);
        testResultInstanceProperty(resultInstance, "dateProperty", dateValue, dateValue);
        testResultInstanceProperty(resultInstance, "objectProperty", objectValue, objectValue);
        testResultInstanceProperty(resultInstance, "functionProperty", functionValue, functionValue);
        testResultInstanceProperty(resultInstance, "toString", toStringMethod, toStringMethod);
        var resultPrototype = Object.getPrototypeOf(resultInstance);
        doh.t(resultPrototype.hasOwnProperty("constructor"));
        doh.is(resultInstance.constructor, resultPrototype.constructor)
      },

      function testContractDeclare() {
        var Result = c.declare(null, {
          invariants : [],
          nullProperty : null,
          booleanProperty : booleanValue,
          stringProperty : stringValue1,
          numberProperty : numberValue1,
          arrayProperty : arrayValue,
          dateProperty : dateValue,
          objectProperty : objectValue,
          functionProperty : functionValue,
          toString : toStringMethod,
          constructor : {
            pre  : [],
            impl : constructor,
            post : [],
            excp : []
          },
          oneMoreMethod : {
            pre  : [],
            impl : functionValue,
            post : [],
            excp : []
          }
        });
        var resultInstance = new Result();
        doh.is(Result, resultInstance.constructor);
//        doh.is(Object.getPrototypeOf(Result), Object.getPrototypeOf(resultInstance));
        testResultInstanceProperty(resultInstance, "nullProperty", null, null);
        testResultInstanceProperty(resultInstance, "booleanProperty", booleanValue, booleanValue);
        testResultInstanceProperty(resultInstance, "stringProperty", stringValue1, stringValue2);
        testResultInstanceProperty(resultInstance, "numberProperty", numberValue1, numberValue2);
        testResultInstanceProperty(resultInstance, "arrayProperty", arrayValue, arrayValue);
        testResultInstanceProperty(resultInstance, "dateProperty", dateValue, dateValue);
        testResultInstanceProperty(resultInstance, "objectProperty", objectValue, objectValue);
        testResultInstanceProperty(resultInstance, "functionProperty", functionValue, functionValue);
        testResultInstanceProperty(resultInstance, "toString", toStringMethod, toStringMethod);
        var resultPrototype = Object.getPrototypeOf(resultInstance);
        doh.t(resultPrototype.hasOwnProperty("constructor"));
        doh.is(resultInstance.constructor, resultPrototype.constructor); // dojo constructor wraps around our function
        testResultInstanceProperty(resultInstance, "oneMoreMethod", functionValue, functionValue);
        functionIsResultingFunctionFromContractMethod(resultInstance.constructor);
        functionIsResultingFunctionFromContractMethod(resultInstance.oneMoreMethod);
      },

      function testContractDeclareWithConditions() {
        var resultInvariants = [
          function() { return this.nullProperty != undefined; },
          function() { return booleanProperty != undefined; },
          function() { return stringProperty != undefined; },
          function() { return numberProperty != undefined; },
          function() { return arrayProperty != undefined; },
          function() { return dateProperty != undefined; },
          function() { return objectProperty != undefined; },
          function() { return functionProperty != undefined; },
          function() { return toString != undefined; },
          function() { return constructor != undefined; },
          function() { return oneMoreMethod != undefined; }
        ];
        var Result = c.declare(null, {
          invariants : resultInvariants,
          nullProperty : null,
          booleanProperty : booleanValue,
          stringProperty : stringValue1,
          numberProperty : numberValue1,
          arrayProperty : arrayValue,
          dateProperty : dateValue,
          objectProperty : objectValue,
          functionProperty : functionValue,
          toString : toStringMethod,
          constructor : {
            pre  : [],
            impl : constructor,
            post : constructorPost,
            excp : []
          },
          oneMoreMethod : {
            pre  : [],
            impl : functionValue,
            post : functionValuePost,
            excp : []
          }
        });
        var resultInstance = new Result();
        doh.is(Result, resultInstance.constructor);
//        doh.is(Object.getPrototypeOf(Result), Object.getPrototypeOf(resultInstance));
        testResultInstanceProperty(resultInstance, "nullProperty", null, null);
        testResultInstanceProperty(resultInstance, "booleanProperty", booleanValue, booleanValue);
        testResultInstanceProperty(resultInstance, "stringProperty", stringValue1, stringValue2);
        testResultInstanceProperty(resultInstance, "numberProperty", numberValue1, numberValue2);
        testResultInstanceProperty(resultInstance, "arrayProperty", arrayValue, arrayValue);
        testResultInstanceProperty(resultInstance, "dateProperty", dateValue, dateValue);
        testResultInstanceProperty(resultInstance, "objectProperty", objectValue, objectValue);
        testResultInstanceProperty(resultInstance, "functionProperty", functionValue, functionValue);
        testResultInstanceProperty(resultInstance, "toString", toStringMethod, toStringMethod);
        var resultPrototype = Object.getPrototypeOf(resultInstance);
        doh.t(resultPrototype.hasOwnProperty("constructor"));
        doh.is(resultInstance.constructor, resultPrototype.constructor); // dojo constructor wraps around our function
        testResultInstanceProperty(resultInstance, "oneMoreMethod", functionValue, functionValue);
        functionIsResultingFunctionFromContractMethod(resultInstance.constructor);
        functionIsResultingFunctionFromContractMethod(resultInstance.oneMoreMethod);
        doh.is(resultInvariants, resultInstance.constructor._meta.invariants);
      },

      function realTest() {
        dojo.config.checkPre = true;
        var now = new Date();

        var Person = c.declare(null, {
          invariants : [
            function() { return this.hasOwnProperty("firstName"); },
            function() { return this.firstName; },
            function() { return isString(this.firstName); },
            function() { return this.hasOwnProperty("lastName"); },
            function() { return this.lastName; },
            function() { return isString(this.lastName); },
            function() { return this.hasOwnProperty("dob"); },
            function() { return this.dob; },
            function() { return this.dob instanceof Date; },
            function() { return now > this.dob; },
            function() { return this.age; },
            function() { return this.age instanceof Function; }
          ],
          constructor : {
            pre  : [
              function(first, last, dob) { return first },
              function(first, last, dob) { return isString(first); },
              function(first, last, dob) { return last },
              function(first, last, dob) { return isString(last); },
              function(first, last, dob) { return dob },
              function(first, last, dob) { return dob instanceof Date}
            ],
            impl : function(first, last, dob) {
              if (now <= dob) {
                throw "dob must be in the past (" + dob + ")";
              }
              this.firstName = first;
              this.lastName = last;
              this.dob = dob;
            },
            post : [
              function(first, last, dob) { return this.firstName === first; },
              function(first, last, dob) { return this.lastName === last; },
              function(first, last, dob) { return this.dob === dob; }
            ],
            excp : [
              function(first, last, dob, exc) { return isString(exc); },
              function(first, last, dob, exc) { return exc === "dob must be in the past (" + dob + ")"; },
              function(first, last, dob, exc) { return now <= dob; }
            ]
          },
          age : {
            pre  : [],
            impl : function() {
              return (new Date(now.getTime() - this.dob.getTime())).getFullYear() - 1970;
            },
            post : [
              function(result) {
                return result === (now.getFullYear() - this.dob.getFullYear() +
                ((now.getMonth() < this.dob.getMonth() ||
                  (now.getMonth() === this.dob.getMonth() && now.getDate() < this.dob.getDate())) ? 1 : 0));
              }
            ],
            excp : []
          }
        });
        // var pInstance = new (Object.getPrototypeOf(Person).cPrePostInvar(Person))("Jan", "Dockx", new Date(1966, 10, 3));
        var pInstance = new Person("Jan", "Dockx", new Date(1966, 9, 3));
        var age = pInstance.age.applyPostInvarCheck(pInstance);
      }

    ]);

  }
);
