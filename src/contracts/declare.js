define(["dojo/_base/declare"], function(dojoDeclare) {

  var _invariantPropertyName = "invariants";
  // hardcoded name of type invariant property

  var _contractMethodImplName = "impl";
  var _contractMethodPreName = "pre";
  var _contractMethodPostName = "post";
  var _contractMethodExcpName = "excp";

  var _callWithContractsMethodName_Pre = "cPre";
  var _callWithContractsMethodName_PrePost = "cPrePost";
  var _callWithContractsMethodName_PrePostInvar = "cPrePostInvar";

  function _errorMsgContractMethod(propName) {
    return "ContractMethod '" + propName + "' not well-formed: ";
  }

  function _crackParameters(className, superclass, props) {
    // summary:
    //    Returns an object with properties "className", "superclass" and "props",
    //    taking into account that in the arguments className is optional; that
    //    superclass may be null, a (constructor) Function, or an Array of
    //    (constructor) Functions; that props is an optional object.
    // returns: Object
    // description:
    //    When there is no className, the first argument is intended to be
    //    superclass, and the second argument is intended to be props.
    //    The resulting object is then
    //    {"className" : "", "superclass" : arguments[0], "props" : arguments[1]}.
    //    When there is a className, the resulting object is
    //    {"className" : arguments[0], "superclass" : arguments[1], "props" : arguments[2]}.

    // copied from dojo/_base/declare.js - declare - first 6 lines of code

    if(typeof className != "string"){
      props = superclass;
      superclass = className;
      className = "";
    }
    props = props || {};

    return {"className" : className, "superclass" : superclass, "props" : props};
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

  function _isFunctionOrArray(candidate) {
    return _isFunction(candidate) || _isArray(candidate);
  }

  function _checkInvariantsWellFormed(candidateInvariants) {
    // summary:
    //    Void method, that throws an error if the candidateInvariants are not
    //    well-formed invariants.

    // TODO
  }

  function _checkPresWellFormed(candidatePres) {
    // summary:
    //    Void method, that throws an error if the candidatePres are not
    //    well-formed preconditions.
    //    Preconditions must have the same argument names as the impl.

    // TODO
  }

  function _checkPostsWellFormed(candidatePosts) {
    // summary:
    //    Void method, that throws an error if the candidatePosts are not
    //    well-formed postconditions.
    //    Postconditions must have the same argument names as the impl, and have one
    //    extra (last) argument, the result.

    // TODO
  }

  function _checkExcpsWellFormed(candidateExcps) {
    // summary:
    //    Void method, that throws an error if the candidateExcps are not
    //    well-formed exception conditions.
    //    Exception conditions must have the same argument names as the impl, and have one
    //    extra (last) argument, the exception, which is not null.

    // TODO
  }

  function _isContractMethod(candidateCm, propName) {
    // summary:
    //    Boolean method that returns true if candidateCm is of (duck) type
    //    ContractMethod. If it is close, but not well-formed, we throw an
    //    error.
    // description:
    //    This method returns true if:
    //    - candidateCm is an Object, i.e., not a function or an Array
    //    - candidateCm has one of the properties impl, pre or post
    //    It then is an error when
    //    - candidateCm does not have all 3 properties impl, pre, post
    //    - impl is not a Function
    //    - _checkPresWellFormed(candidateCm.pre) fails
    //    - _checkPostsWellFormed(candidateCm.post) fails

    var result = candidateCm && (! _isFunctionOrArray(candidateCm)) &&
                   (candidateCm.hasOwnProperty(_contractMethodImplName) ||
                     candidateCm.hasOwnProperty(_contractMethodPreName) ||
                     candidateCm.hasOwnProperty(_contractMethodPostName) ||
                     candidateCm.hasOwnProperty(_contractMethodExcpName));

    if (result) {
      if (! candidateCm.hasOwnProperty(_contractMethodPreName)) {
        throw new SyntaxError(_errorMsgContractMethod(propName) + _contractMethodPreName + " not defined");
      }
      if (! candidateCm.hasOwnProperty(_contractMethodImplName)) {
        throw new SyntaxError(_errorMsgContractMethod(propName) + _contractMethodImplName + " not defined");
      }
      if (! candidateCm.hasOwnProperty(_contractMethodPostName)) {
        throw new SyntaxError(_errorMsgContractMethod(propName) + _contractMethodPostName+ " not defined");
      }
      if (! candidateCm.hasOwnProperty(_contractMethodExcpName)) {
        throw new SyntaxError(_errorMsgContractMethod(propName) + _contractMethodExcpName+ " not defined");
      }
      if (! _isArray(candidateCm[_contractMethodPreName])) {
        throw new SyntaxError(_errorMsgContractMethod(propName) + _contractMethodPreName+ " not an Array");
      }
      if (! _isFunction(candidateCm[_contractMethodImplName])) {
        throw new SyntaxError(_errorMsgContractMethod(propName) + _contractMethodImplName+ " not a Function");
      }
      if (! _isArray(candidateCm[_contractMethodPostName])) {
        throw new SyntaxError(_errorMsgContractMethod(propName) + _contractMethodPostName+ " not an Array");
      }
      if (! _isArray(candidateCm[_contractMethodExcpName])) {
        throw new SyntaxError(_errorMsgContractMethod(propName) + _contractMethodExcpName+ " not an Array");
      }

      _checkPresWellFormed(candidateCm[_contractMethodPreName]);
      _checkPostsWellFormed(candidateCm[_contractMethodPostName]);
    }

    return result;
  }

  function argumentsToArray(argsThing) {
    var result = [];
    var i;
    for (i = 0; i < argsThing.length; i++) {
      result.push(argsThing[i]);
    }
    return result;
  }

  function checkConditions(conditionTypeText, conditions, subject, args, extraArg) {
    var extendedArgs = args ? args.slice(0) : [];
    extendedArgs.push(extraArg);
    var errors = [];
    conditions.forEach(function(condition) {
      var conditionResult;
      try {
        conditionResult = condition.apply(subject, extendedArgs);
        if (!conditionResult ) {
          errors.push(condition);
        }
      }
      catch (e) {
        errors.push({
          condition : condition,
          exc       : e
        });
      }
    });
    if (errors.length > 0) {
      var error = {
        msg    : conditionTypeText + "s failed",
        errors : errors,
        toString : function() {
          return this.msg + " [" + this.errors + "]";
        }
      };
      throw error;
    }
  }

  function _functionWithPost(method) {
    return function(theThis, args) {
      var result;
      var nominalEnd = false;
      try {
        result = method[_contractMethodImplName].apply(theThis, args);
        nominalEnd = true;
      }
      catch (methodExc) {
        // this is exceptional (non-nominal), yet defined behavior
        checkConditions("Exception condition", method[_contractMethodExcpName], theThis, args, methodExc);
      }
      if (nominalEnd) {
        checkConditions("Postcondition", method[_contractMethodPostName], theThis, args, result);
      }
      return result;
    };
  }

  function _functionWithPostInvar(method) {
    return function(theThis, args) {
      var invariants = theThis.constructor._meta[_invariantPropertyName];
      if (!invariants) {
        throw "No invariants found in " + theThis;
      }
      var result;
      var nominalEnd = false;
      try {
        result = method[_contractMethodImplName].apply(theThis, args);
        nominalEnd = true;
      }
      catch (methodExc) {
        // this is exceptional (non-nominal), yet defined behavior
        checkConditions("Invariant", invariants, theThis, [], null);
        checkConditions("Exception condition", method[_contractMethodExcpName], theThis, args, methodExc);
      }
      if (nominalEnd) {
        checkConditions("Invariant", invariants, theThis, [], null);
        checkConditions("Postcondition", method[_contractMethodPostName], theThis, args, result);
      }
      return result;
    };
  }

  function doctoredFunction(/*Function*/ f, /*Array*/ preconditions) {
    // summary: f if dojoConfig.checkPre is false,
    //          a function that first checks the preconditions of f, and
    //          the applies f, if dojoConfig.checkPre is true
    if (dojo.config.checkPre) { // MUDO use has!
      return function() {
        var args = argumentsToArray(arguments);
        checkConditions("Preconditions", preconditions, this, args, null);
        return f.apply(this, args);
      };
    }
    else {
      return f;
    }
  }

  function ppwcodeDeclare(className, superclass, props) {
    var trueArgs = _crackParameters(className, superclass, props);
    /* we normalize props, so that we are sure that
     * - a property "invariants" contains sensible invariants
     * - if the value of a property with name pn of props (props[pn]) is an object cm that
     *   has (duck) type ContractMethod,
     *   -- the actual function (cm.impl) is a function, and associated to the property name
     *      (in stead of cm)
     *   -- the preconditions (cm.pre) are sensible preconditions, and associated to the
     *      pre property of the method in props (props[pn].pre)
     *   -- the postconditions (cm.post) are sensible postconditions, and associated to the
     *      post property of the method in props (props[pn].post)
     */
    var trueProps = trueArgs.props;
    var invariants = [];
    var classHasContracts = trueProps.hasOwnProperty(_invariantPropertyName);
    if (classHasContracts) {
      var propNames = Object.getOwnPropertyNames(trueProps);
      propNames.forEach(function(propName) {
        var propValue = trueProps[propName];
        if (propName === _invariantPropertyName) {
          _checkInvariantsWellFormed(propValue);
          invariants = propValue;
          delete trueProps[_invariantPropertyName];
        }
        else if (_isContractMethod(propValue, propName)) {
          // also for the constructor, but that is not enough!
          var actualMethod = propValue[_contractMethodImplName];
          var doctoredMethod = doctoredFunction(actualMethod, propValue[_contractMethodPreName]);
          doctoredMethod[_contractMethodPreName] = propValue[_contractMethodPreName];
          doctoredMethod[_contractMethodImplName] = actualMethod;
          doctoredMethod[_contractMethodPostName] = propValue[_contractMethodPostName];
          doctoredMethod[_contractMethodExcpName] = propValue[_contractMethodExcpName];
          doctoredMethod.applyPostCheck = _functionWithPost(doctoredMethod);
          doctoredMethod.applyPostInvarCheck = _functionWithPostInvar(doctoredMethod);
          trueProps[propName] = doctoredMethod;
        }
      });
    }
    var result = dojoDeclare(trueArgs.className, trueArgs.superclass, trueProps);
    if (classHasContracts) {
      // now we still need to add stuff back to the constructor
      result[_contractMethodPreName] = result._meta.ctor[_contractMethodPreName];
      result[_contractMethodImplName] = result;
      result[_contractMethodPostName] = result._meta.ctor[_contractMethodPostName];
      result[_contractMethodExcpName] = result._meta.ctor[_contractMethodExcpName];
      result.applyPostCheck = _functionWithPost(result);
      result.applyPostInvarCheck = _functionWithPostInvar(result);
      // finally, add the invariants to _meta
      result._meta[_invariantPropertyName] = invariants;
    }

    return result;
  }

  var contract = {
    declare: ppwcodeDeclare,
    applyPostCheck: _functionWithPost,
    applyPostInvarCheck: _functionWithPostInvar
  }

  return contract;

});
