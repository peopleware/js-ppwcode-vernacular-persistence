/*
 Copyright 2013 - $Date $ by PeopleWare n.v.

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

define(["dojo/_base/declare",
        "ppwcode-util-contracts/_Mixin",
        "./UrlBuilder", "./PersistentObject", "ppwcode-vernacular-semantics/IdentifiableObject",
        "./IdNotFoundException", "ppwcode-vernacular-exceptions/SecurityException", "./ObjectAlreadyChangedException",
        "ppwcode-vernacular-exceptions/SemanticException",
        "dojo/Deferred", "dojo/request", "dojo/_base/lang", "ppwcode-util-oddsAndEnds/js", "dojo/topic",
        "dojox/uuid/generateRandomUuid",
        "dojo/has", "dojo/promise/all", "ppwcode-util-oddsAndEnds/log/delayedLogger!", "module"],
  function(declare,
           _ContractMixin,
           UrlBuilder, PersistentObject, IdentifiableObject,
           IdNotFoundException, SecurityException, ObjectAlreadyChangedException, SemanticException,
           Deferred, request, lang, js, topic,
           generateRandomUuid,
           has, all, logger, module) {

    var storedSessionsKey = module.id + "/sessions";
    var cacheHistoryKeyPostfix = "#cacheHistory";

    function cacheHistoryCleanup(sessions) {
      // remove old session
      var numberOfDaysToKeep = has(module.id + "-cacheReporting-keepNrOfDays") || 7;
      var cutOffDate = new Date();
      cutOffDate.setDate(cutOffDate.getDate() - numberOfDaysToKeep);
      var sessionsToKeep = sessions.filter(function(session) {return cutOffDate < session.createdAt;});
      // remove cache histories with an unknown session of session that are not to be kept
      var toBeRemoved = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.indexOf(cacheHistoryKeyPostfix) === (key.length - cacheHistoryKeyPostfix.length)
            && !sessionsToKeep.some(function(sessionToKeep) {return sessionToKeep.key + cacheHistoryKeyPostfix === key;})) {
          toBeRemoved.push(key);
        }
      }
      toBeRemoved.forEach(function(key) {
        localStorage.removeItem(key);
        logger.info("Removed cache history " + key);
      });
      return sessionsToKeep;
    }

    var session;
    if (localStorage) {
      session = {
        createdAt: new Date(),
        key: generateRandomUuid()
      };
      {
        var sessions = localStorage.getItem(storedSessionsKey);
        sessions = sessions ? JSON.parse(sessions) : [];
        sessions.forEach(function(session) {session.createdAt = new Date(session.createdAt);});
        sessions = cacheHistoryCleanup(sessions);
        sessions.push(session);
        localStorage.setItem(storedSessionsKey, JSON.stringify(sessions));
        logger.info("Session key is " + session.key);
      }
    }

    //   When we do an action on the server, it either succeeds or fails.
    //   If it fails, it is because of an `IdNotFoundException`, `SecurityException`, `ObjectAlreadyChangedException`,
    //   another `SemanticException`, or a server or communication error.
    //   If it succeeds, the requested action has happened.
    //
    //   If we get an `IdNotFoundException` or `SecurityException`, we know that the reported object
    //   is no longer available for the current user. For all practical purposes, we should consider it
    //   deleted on the server. We can get this report from the server for any object for any action.
    //   It most probably is about the object we requested an action on, or a related object.
    //   No other error signals that the reported object is no longer available. That an object is no longer
    //   available is also signalled by successful completion of the delete action. The only difference in
    //   this case is that the object no longer being available is the nominal effect of the action, while when
    //   we get an exception, it is exceptional behavior. Note that delete could, in theory, also end
    //   exceptionally with a report about another object being no longer available.
    //   These exceptions can also occur during refresh / retrieve / cancel.
    //   We should signal the user, with a warning in one case, and give less obtrusive feedback in the nominal case.
    //   All references to the object that is no longer available, in RAM and in user interface, should be removed.
    //
    //   If we get an `ObjectAlreadyChangedException` or another `SemanticException`, it can be about the object we
    //   requested an action for, or about another object, or even several different objects. It most probably is
    //   about the object we requested an action on, or a related object.
    //   We should issue the user with a warning, offer him the possibility to review or change his input, and try
    //   again, or cancel. The message should probably be different in both cases. How to deal with this in detail
    //   (fields to report validation problems with, resetting of fields, ..) can only be decided by the initiator
    //   of the action. Also, no other UI elements than those from which the action was initiated should be part
    //   of the reaction.
    //
    //   When we get fresh date for objects, all UI aspects are updated via revival of the cached objects.
    //   We don't need to signal this any further. The happens with a succesful update and create, but also as a side
    //   effect, for related objects, for any action.
    //
    //   When an object is discovered to be no longer available, as a result of a delete action, or as an exceptional
    //   discovery during another action, or when we have succesfully created an object, collections of objects
    //   might have changed (more or less objects in the collection). This collections should be signalled to refresh.
    //
    //   In conclusion, we can say we need the following signals:
    //   - an object is no longer available, because
    //     - it cannot be found anymore
    //     - the user can (no longer) access it
    //     This should be signalled generally, because it might be an exceptional side effect, or the intention of the
    //     action, but the reaction should be more or less the same. In the signal, we should mention whether or not
    //     it is exceptional or nominal, to be able to diversify the communication to the user.
    //   - an object is already changed, or has validation issues
    //     The calling code will handle the details, but the signal enables a communication to the user in a general
    //     fashion.
    //
    //   We don't really need signals about succesful creation or update, or the reception of fresh data for objects,
    //   but a general mechanism that also signals this might be used to post messages for the user.
    //
    //   A general form of the notifications should say what happened to a given object, and mention the action
    //   that triggered the effect.
    //   Objects can
    //   - change data, with a new `persistenceVersion`
    //   - change data, with the same `persistenceVersion` (reset)
    //     If we receive data with the same `persistenceVersion` that does not differ from the data we have, we better
    //     not signal anything.
    //   - become available
    //   - stop being available
    //
    //   What doesn't fit in this scheme is a signal about `ObjectAlreadyChangedException` or another
    //  `SemanticException`. In neither case, anything happens to the object (and we don't want to blindly change
    //   our object state to the new or old server state, because then we loose the user's edits).
    //
    //   Another approach could mention, on completion, the action, and the effect.
    //   We know that with an action on an object, we get that object and its upstream relationships.
    //   We will not signal about objects for which we got data, but did not change.
    //   A reset is only executed when explicitly requested. Otherwise, it is considered an
    //   `ObjectAlreadyChangedException`.
    //   - object reset
    //     - success
    //     -- objects changed, with a new `persistenceVersion`
    //     -- objects changed, with the same `persistenceVersion`
    //     -- newly discovered objects
    //     - or failure
    //     -- `IdNotFoundException` or `SecurityException` for 1 object
    //     - or error
    //   - object retrieve
    //     - success
    //     -- objects changed, with a new `persistenceVersion`
    //     -- newly discovered objects
    //     - or failure
    //     -- `IdNotFoundException` or `SecurityException` for 1 object
    //     - or error
    //   - object create
    //     - success
    //     -- 1 object added
    //     -- objects changed, with a new `persistenceVersion`
    //     -- newly discovered objects
    //     - or failure
    //     -- simple
    //     --- IdNotFoundException` or `SecurityException` for 1 object
    //     ---`ObjectAlreadyChangedException` for 1 object
    //     -- or other `SemanticException`s, for related objects
    //     - or error
    //   - object update
    //     - success
    //     -- objects changed, with a new `persistenceVersion`
    //     -- newly discovered objects
    //     - or failure
    //     -- simple
    //     --- IdNotFoundException` or `SecurityException` for 1 object
    //     ---`ObjectAlreadyChangedException` for 1 object
    //     -- or other `SemanticException`s, for related objects
    //     - or error
    //   - object delete
    //     - success
    //     -- 1 object deleted
    //     -- objects changed, with a new `persistenceVersion`
    //     -- newly discovered objects
    //     - or failure
    //     -- simple
    //     --- IdNotFoundException` or `SecurityException` for 1 object
    //     ---`ObjectAlreadyChangedException` for 1 object
    //     -- or other `SemanticException`s, for related objects
    //     - or error
    //
    //   A possible signal structure thus seems to be
    //   - the intended action
    //   - the subject of the action, if possible
    //   - the outcome, being
    //     - succesful, listing
    //       - objects changed, with a new `persistenceVersion`
    //       - objects changed, with the same `persistenceVersion` (only reset)
    //       - newly discovered objects
    //       - 1 object added
    //       - 1 object deleted
    //     - `IdNotFoundException` or `SecurityException` for 1 object
    //     - `ObjectAlreadyChangedException` for 1 object (not retrieve or reset)
    //     - other `SemanticException`s, for related objects (not retrieve or reset)
    //     - error
    //
    //   A possible signal structure thus seems to be
    //   - the intended action
    //   - the subject of the action, if possible
    //   - the outcome, being
    //     - success
    //     - `IdNotFoundException` or `SecurityException` for 1 object
    //     - `ObjectAlreadyChangedException` for 1 object (not retrieve or reset)
    //     - other `SemanticException`s, for related objects (not retrieve or reset)
    //     - error
    //   - the effect, being
    //     - objects changed, with a new `persistenceVersion`
    //     - objects changed, with the same `persistenceVersion` (only reset)
    //     - newly discovered objects, including the ones added
    //     - objects that became unavailable
    //
    //   Note that in this proposal, we do not report on objects that just stop being cached.
    //   In that respect, should we report on objects that are newly discovered, but not added?
    //   This was added for collections, that need to be refreshed when objects might be added
    //   or removed. What could happen is that we load, via a search, a child, whose parent was loaded
    //   earlier, and is visible now, before this child was made a child of the parent.
    //   When we signal this newly discoverd child, the list in the representation of the parent
    //   would detect the child as relevant for him, and could refresh. The reverse, when a child stops
    //   being a child, cannot also happen. But that is signalled as the child being changed, with a new
    //   `persistenceVersion`. The list in the representation might detect that it has the child, but
    //   that it should refresh because it is no longer its parent. This should be done using MVC, because
    //   otherwise all lists should check all children on every change.
    //
    //   It is important to make a distinction between reporting about server state, and cache state.
    //   We are concerned here to report about server state.
    //   Objects changed, with a new `persistenceVersion`, 1 object added, and objects that became unavailable,
    //   are changed in the server state.
    //   Newly discovered objects and objects changed with the same `persistenceVersion`, are cache-related
    //   issues. Let's not deal with that now.
    //
    //   SecurityException currently does not report a persistenceId. It can be anything. So we cannot conclude
    //   that the subject of the action has become unavailable. We threat it like any other error
    //   for now.

    var ActionCompleted = declare([_ContractMixin], {
      // summary:
      //   Signal that `action` has happened on `persistentObject`. This might not be what you ordered.

      // crudDao: CrudDao
      crudDao: null,

      // action: String
      //   The action taken: "GET", "POST" (create), "PUT" (update) or "DELETE".
      action: null,

      // subject: IdentifiableObject
      //   The object that the `action` was executed on, in the state after the succesful `action`.
      subject: null,

      // exception: Object?
      //   A SemanticException or other error that occured during the execution of `action`.
      //   If `null`, the action completed successfully.
      exception: null,

      // changed: VersionedPersistentObject[]
      //   Objects of which the `persistenceVersion` changed during the action.
      // changed: null,
      // IDEA not supported for now

      // created: PersistentObject?
      //   An object that was created during the action, if any.
      created: null,

      // disappeared: PeristentObject
      //   An object that we became aware off that disappeared during the action.
      disappeared: null,

      _c_invar: [
        function() {return this._c_prop_mandatory("crudDao");},
        function() {return this._c_prop_instance("crudDao", CrudDao);},
        function() {return this._c_prop_mandatory("action");},
        function() {return this._c_prop_string("action");},
        function() {return 0 <= ["GET", "POST", "PUT", "DELETE"].indexOf(this.action)},
        function() {return (this.action === "GET" && this.exception) || this._c_prop_mandatory("subject");},
        function() {return this._c_prop_instance("subject", IdentifiableObject);},
        function() {return this.exception
                           || ["POST", "PUT", "DELETE"].indexOf(this.action) < 0
                           || this._c_prop_instance("subject", PersistentObject);},
        function() {return this._c_prop_mandatory("url");},
        function() {return this._c_prop_string("url");},
        // exception is optional, and can be anything
        // function() {return this._c_prop_array("changed", VersionedPersistentObject);},
        // IDEA changed not supported for now
        function() {return this._c_prop_instance("created", PersistentObject);},
        function() {return this._c_prop_instance("disappeared", PersistentObject);}
      ],

      constructor: function(/*{crudDao: CrudDao,
                               action: String,
                               subject: PersistentObject?,
                               url: String,
                               exception: Object?,
                               changed: VersionedPersistentObject[]?,
                               created: PersistentObject?,
                               disappeared: PersistentObject?}*/ kwargs) {
        // summary:
        //   Object.freeze this when ready, before publishing.
        this._c_pre(function() {return kwargs;});
        this._c_pre(function() {return this._c_prop_mandatory(kwargs, "crudDao");});
        this._c_pre(function() {return this._c_prop_instance(kwargs, "crudDao", CrudDao);});
        this._c_pre(function() {return this._c_prop_mandatory(kwargs, "action");});
        this._c_pre(function() {return this._c_prop_string(kwargs, "action");});
        this._c_pre(function() {
          return kwargs.action === "GET"
                 || kwargs.action === "POST"
                 || kwargs.action === "PUT"
                 || kwargs.action === "DELETE";
        });
        this._c_pre(function() {return kwargs.action === "GET" || this._c_prop_mandatory(kwargs, "subject");});
        // might be filled out later
        this._c_pre(function() {return !kwargs.subject || this._c_prop_instance(kwargs, "subject", IdentifiableObject);});
        this._c_pre(function() {
          return kwargs.exception
                 || ["POST", "PUT", "DELETE"].indexOf(kwargs.action) < 0
                 || this._c_prop_instance(kwargs, "subject", PersistentObject)
        });
        this._c_pre(function() {return this._c_prop_mandatory(kwargs, "url");});
        this._c_pre(function() {return this._c_prop_string(kwargs, "url");});
        // exception is optional, and can be anything
        // this._c_pre(function() {return this._c_prop_array(kwargs, "changed", VersionedPersistentObject);})
        // IDEA changed not supported for now
        this._c_pre(function() {return !kwargs.created || this._c_prop_instance(kwargs, "created", PersistentObject);});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable
          return !kwargs.disappeared || this._c_prop_instance(kwargs, "disappeared", PersistentObject);
        });

        Object.defineProperty(
          this,
          "crudDao",
          {
            value: kwargs.crudDao,
            writable: false,
            configurable: false,
            enumerable: true
          }
        );
        Object.defineProperty(
          this,
          "action",
          {
            value: kwargs.action,
            writable: false,
            configurable: false,
            enumerable: true
          }
        );
        Object.defineProperty(
          this,
          "url",
          {
            value: kwargs.url,
            writable: false,
            configurable: false,
            enumerable: true
          }
        );
        this.subject = kwargs.subject;
        this.exception = kwargs.exception;
        // this.changed = kwargs.changed ? kwargs.changed.slice() : [];
        // IDEA changed not supported for now
        this.created = kwargs.created;
        //noinspection JSUnresolvedVariable
        this.disappeared = kwargs.disappeared;
      },

      subjectRepresentation: function(/*String*/ locale) {
        return this.subject
          ? (this.subject.getLabel
                 ? this.subject.getLabel({formatLength: "long", locale: locale})
                 : this.subject.getKey())
          : "—";
      },

      toString: function() {
        return this.action + " for " +
               (this.subject ? this.subject.getKey()  : "-- no subject known --") +
               "; outcome: " + (this.exception ? "exceptional" : "nominal");
      }

    });

    //noinspection MagicNumberJS
    var CrudDao = declare([_ContractMixin], {
      // summary:
      //
      //   In the absence of some form of weak reference in JavaScript (promised for ECMAScript 6 / Harmony,
      //   see <http://wiki.ecmascript.org/doku.php?id=harmony:harmony>), we use reference tracking to be
      //   able to release instances from the cache.

      _c_invar: [
        function() {return this._c_prop("urlBuilder");},
        function() {return this.urlBuilder ? this.urlBuilder.isInstanceOf && this.urlBuilder.isInstanceOf(UrlBuilder) : true;}
      ],

      // timeout: Number
      //   The default timeout in ms
      timeout: 10000, // needed for older hardware
      /* IDEA detect we are on older hardware, and set it to 10 then; e.g., count to 1 000 000, and depending on the
         speed ... */

      // toManyTimeout: Number
      //   Separate timeout for retrieveToMany, which in some implementations takes much longer
      toManyTimeout: 10000,

      // maxConcurrentRequests: Number
      //   The maximum number of concurrent connections. Later requests will be queued, and handled when earlier
      //   requests finish.
      maxConcurrentRequests: 16,
      // any lower limit makes Chrome slower! this is introduced for eopdf

      // _numberOfExecutingRequests: Number
      //   The number of requests currently executing.
      _numberOfExecutingRequests: 0,

      // _queuedRequests: Function[]
      //    Requests waiting for execution, because there are too many concurrent requests already.
      _queuedRequests: null,

      // urlBuilder: UrlBuilder
      urlBuilder: null,

      actionCompletedTopicName: module.id,

      _publishActionCompleted: function(/*ActionCompleted*/ signal) {
        Object.freeze(signal);
        topic.publish(this.actionCompletedTopicName, signal);
      },

      // revive: Function
      //   Object x Object -> Object|Promise of Object
      //   Function that returns the Promise of a revived object graph, based on an
      //   object tree (intended to be parsed JSON) of which the objects are to be reloaded
      //   in PersistentObjects, new or found in the cache of CrudDao. Objects are added to the cache
      //   of the given CrudDao with the second argument as referer on the first level, and the
      //   resulting PersistentObjects as referer for PersistentObject further down in the tree.
      //   As this might require module loading, the result might be a Promise.
      revive: null,

      // cache: _Cache
      //   Hash that stores all tracked objects and stores, using a cacheKey
      //   Contains an entry for each retrieved object, that is not yet released.
      cache: null,

      // reporting: Boolean
      //   We report the state of the cache each _cacheReportingPeriod.
      //   -1 means no reporting (default); 0 means report on every access, > 0 means report each ... ms
      //   Use setCacheReportingPeriod to change, to trigger the intervals.
      _cacheReportingPeriod: -1,
      _cacheReportingTimer: null,
      _cacheReportingHistory: [],

      setCacheReportingPeriod: function(value) {
        if (this._cacheReportingTimer) {
          //noinspection JSUnresolvedFunction
          clearInterval(this._cacheReportingTimer);
        }
        this._cacheReportingPeriod = (js.typeOf(value) === "number") ? value : (value ? 0 : -1);
        if (value > 0) {
          this._cacheReport(true);
          //noinspection JSUnresolvedFunction
          this._cacheReportingTimer = setInterval(lang.hitch(this, this._cacheReport, true), value);
        }
      },

      _optionalCacheReporting: function() {
        this._cacheReport(this._cacheReportingPeriod === 0);
      },

      _cacheReport: function(/*Boolean*/ log) {
        //noinspection JSUnresolvedFunction
        var report = this.cache.report();
        //noinspection JSUnresolvedVariable
        var reportEntry = {
          at: new Date(),
          earliestEntry: report.earliestEntry,
          lastEntry: report.lastEntry,
          nrOfEntries: report.nrOfEntries,
          nrOfReferers: report.nrOfReferers
        };
        if (session) {
          var cacheHistoryKey = session.key + cacheHistoryKeyPostfix;
          var cacheHistory = localStorage.getItem(cacheHistoryKey);
          cacheHistory = cacheHistory ? JSON.parse(cacheHistory) : [];
          cacheHistory.push(reportEntry);
          localStorage.setItem(cacheHistoryKey, JSON.stringify(cacheHistory));
        }
        if (log && logger.isInfoEnabled()) {
          logger.info(function() {return "CCCC cache report TTTT: " + JSON.stringify(reportEntry)});
        }
      },

      _copyKwargsProperties: function(kwargs, propertyNames) {
        var self = this;
        if (kwargs) {
          propertyNames.
            filter(function(pName) {return kwargs[pName];}).
            forEach(function(pName) {self[pName] = kwargs[pName];});
        }
      },

      constructor: function(kwargs) {
        this._copyKwargsProperties(kwargs, ["urlBuilder", "revive", "cache", "replacer", "timeout", "toManyTimeout"]);
        this._retrievePromiseCache = {};
        this._queuedRequests = [];
      },

      postscript: function() {
        this.setCacheReportingPeriod(has((this.constructor.mid || module.id) + "-cacheReporting"));
      },

      handleNotAuthorized: function() {
        // summary:
        //   Some browsers do not present a log-in dialog when an AJAX call returns a 401.
        //   This function says what we do then.
        //   This cannot be implemented in general, but subclasses can provide an override.

        logger.debug("handleNotAuthorized called.");
      },

      _handleException: function(exc, contextDescription, /*String?*/ requestedTypeDescription) {
        // summary:
        //   Triage and handle `exc`.
        //   This method does not throw exceptions itself, but translates `exc` into another exception
        //   that will be thrown if that is applicable, or return the original exc to be thrown. It always
        //   returns an exception to be thrown.

        if (!exc) {
          logger.error(function() {return "Asked to handle an exception, but there is none (" + contextDescription + ")."});
          return undefined;
        }
        if (exc.dojoType === "cancel") {
          logger.info(function() {return "Remote action cancelled (" + contextDescription + ")."});
          /*
           We might want to eat this exception: it is not a problem; the Promise is cancelled.
           However, it seems to be the only way to signal cancellation reliably. dgrid e.g.
           uses it.
           So we only don't log it as an error.
           */
          return exc;
        }
        if (exc.response) {
          //noinspection MagicNumberJS
          if (exc.response.status === 401 || (has("trident") && exc.response.status === 0)) {
            // Normally, we should not get a 401. The browser should present a login dialog to the user.
            // Not all browsers do that, though, for AJAX requests. In those cases, we detect it,
            // and handle it ourselves in some way. E.g., change the window location
            // to a server login page, that redirects here again after successful login.
            // ie ("trident") has issues with a 401; this is a workaround, that will result in infinite reloads if
            // something truly bad happens
            logger.info(function() {return "Not authorized leaked through (" + contextDescription + ").", exc});
            this.handleNotAuthorized(); // this method might do a redirect, so it might not return
            return exc; // we may not get here
          }
          //noinspection MagicNumberJS
          if (exc.response.status === 404) {
            var kwargs = {cause: exc.response.data};
            if (exc.response.data && exc.response.data["$type"] && exc.response.data["$type"].indexOf) {
              if (exc.response.data["$type"].indexOf("PPWCode.Vernacular.Persistence.I.Dao.IdNotFoundException") >= 0) {
                // NOTE: sic! Yes, there is a typo in the server code (missing "t" in "persistenObjectType")
                //noinspection JSUnresolvedVariable
                kwargs.serverType = exc.response.data.Data.persistenObjectType;
                // IDEA server is stupid; this is _always_ "PPWCode.Vernacular.Persistence.I.IPersistentObject, ..."
                if (requestedTypeDescription) {
                  kwargs.typeDescription = requestedTypeDescription;
                }
                //noinspection JSUnresolvedVariable
                kwargs.persistenceId = exc.response.data.Data.persistenceId;
              }
            }
            var infExc = new IdNotFoundException(kwargs);
            logger.info(function() {return "Not found (" + contextDescription + "): ", infExc});
            return infExc;
          }
          if (exc.response.data && exc.response.data["$type"] && exc.response.data["$type"].indexOf) {
            if (exc.response.data["$type"].indexOf("PPWCode.Vernacular.Persistence.I.Dao.DaoSecurityException") >= 0) {
              logger.warn(
                function() {return "Server reported dynamic security exception (" + contextDescription + ")."},
                exc.response.data
              );
              return new SecurityException({cause: exc.response.data});
            }
            if (exc.response.data["$type"].indexOf("PPWCode.Vernacular.Persistence.I.Dao.ObjectAlreadyChangedException") >= 0) {
              logger.info(
                function() {return "Server reported object already changed (" + contextDescription + ")."},
                exc.response.data
              );
              //noinspection JSUnresolvedVariable
              return new ObjectAlreadyChangedException({
                cause: exc.response.data,
                newVersion: exc.response.data && exc.response.data.Data && exc.response.data.Data.sender
              });
            }
            if (exc.response.data["$type"].indexOf(".DbConstraintExceptionData") >= 0) {
              // IDEA full namespace is specific for a project :-(
              logger.info(
                function() {return "Server reported DB constraint violated (" + contextDescription + ")."},
                exc.response.data
              );
              /* IDEA naked SemanticException for now; we don't have enough info to make this more specific now
              exc.response.data.constraintName has the name of the DB constraint that is violated, but
              the interpretation of what that means belongs on the server.
              Probably, if it starts with UQ, there is some uniqueness being violated.
              We need more streamlining before we can make a good user message.
              For now, we take the approach to only translate what we are sure of.
               */
              //noinspection JSUnresolvedVariable
              if (exc.response.data.constraintType === "DbUniqueConstraintException") {
                return new SemanticException({key: "NOT UNIQUE", cause: exc.response.data});
              }
              return new SemanticException({cause: exc.response.data});
            }
          }
          if (exc.response.status === 403 || exc.response.status === 410) {
            /* IDEA shaky, but for now we make this a very general semantic exception */
            return new SemanticException({cause: exc.response.data});
          }
          //noinspection MagicNumberJS
          if (exc.response.status === 500) {
            logger.error("Server reported internal error (" + contextDescription + ").");
          }
          else {
            logger.error("Server reported untriaged error (" + contextDescription + ").");
          }
          if (exc.response.status) {
            logger.error("Response status: ", exc.response.status);
          }
          if (exc.response.data) {
            logger.error("Response data: ", JSON.stringify(exc.response.data));
          }
          else if (exc.response.text) {
            logger.error("Response text: ", exc.response.text);
          }
        }
        logger.error("Unhandled exception (" + contextDescription + "): ", exc);
        return exc;
      },

      _queued: function(/*Function*/ promiseFunction) {

        function actualCall() {

          function requestDone() {
            self._numberOfExecutingRequests--;
            var nextRequest = self._queuedRequests.shift(); // fifo
            if (nextRequest) {
              nextRequest.call(this);
            }
          }

          self._numberOfExecutingRequests++;
          var done = promiseFunction.call();
          return done.then(
            function(result) {
              requestDone();
              return result;
            },
            function(err) {
              requestDone();
              throw err;
            }
          );
        }


        var self = this;

        if (self._numberOfExecutingRequests < self.maxConcurrentRequests) {
          logger.debug(function() {
            return "Concurrent requests: " + self._numberOfExecutingRequests + " (max " +
                       self.maxConcurrentRequests + ") - not queueing this request"});
          return actualCall();
        }
        logger.info(function() {
          return "Reached maximum number of concurrent requests (max " + self.maxConcurrentRequests +
                    ") - queueing this request (" + self._queuedRequests.length + " pending already)"});
        // queue the request for later; return a Promise for the Promise
        var deferred = new Deferred();
        self._queuedRequests.push(
          function() {
            logger.info(function() {return "Starting queued request. (" + self._queuedRequests.length + " left in queue)"});
            var done = actualCall();
            done.then(
              function(result) {
                logger.debug("Queued request ended nominally.");
                deferred.resolve(result);
              },
              function(err) {
                logger.error("Queued request ended with an error.");
                deferred.reject(err);
              }
            );
          }
        ); // fifo
        return deferred.promise;
      },

      _piggyBackTotalPromise: function(/*Promise*/ promise, /*Promise*/ totalPromise) {
        // summary:
        //   Piggyback total promise on final Promise. Since Promise is sealed, we need a delegate.

        return lang.delegate(promise, {total: totalPromise});
      },

      _refresh: function(/*PersistentObjectStore|Observable(PersistentObjectStore)*/ result,
                         /*String*/ url,
                         /*Object?*/ query,
                         /*Object?*/ referer,
                         /*Object?*/ options,
                         /*Number?*/ timeout) {
        // summary:
        //   Get all the objects with `url` and the optional `query` from the remote server,
        //   and update `result` to reflect the returned collection when an answer arrives.
        //   This returns a Promise, that resolves to result.
        //   *The resulting objects are tracked with referer, if there is one.*
        //   Errors are not handled here.
        // result: PersistentObjectStore|Observable(PersistentObjectStore)
        //   Mandatory. When the promise is resolved, it will contain exactly the objects that were returned.
        // url: String
        //   Mandatory.
        // query: Object?
        //   Optional. The semantics of these parameters are left to the server.
        // referer: Object?
        //   Optional. This object will be used as referer in the _Cache for objects revived in the result.
        // options: Object?
        //   Optional options object. We only use the paging settings:
        //   - options.start: Number?: The index of the first result we expect. Default is 0 (0-based counting)
        //   - options.count: Number?: The number of objects we request, starting from `start`. The server might return less,
        //                             if there are no more, or if it decides to return less (e.g., because the server
        //                             return count is capped to a lower number). Default is as many as possible.
        //   We expect a consistent sorting order on the server for paging.
        // timeout: Number?
        //   Optional override of this.timeout.
        // description:
        //   The objects might be in result or the cache beforehand. Those objects are reloaded,
        //   and might send changed events.
        //
        //   The remote retrieve might fail, with an error, which is returned by the errback
        //   of the returned Promise. In that case, `result` is left unchanged.
        //
        //   A search for a specific `serverType` without a `query` should return all
        //   objects of that type.
        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable
          return result && result.isInstanceOf;
        });
        // Cannot really formulate what we want, because of stupid Observable Store wrapper
        // this._c_pre(function() {return result && result.isInstanceOf && result.isInstanceOf(StoreOfStateful);});
        this._c_pre(function() {return js.typeOf(url) === "string";});
        this._c_pre(function() {return !query || js.typeOf(query) === "object";});
        this._c_pre(function() {return !options || js.typeOf(options) === "object";});
        this._c_pre(function() {return !options || !options.start || js.typeOf(options.start) === "number";});
        this._c_pre(function() {return !options || !options.count || js.typeOf(options.count) === "number";});

        logger.debug("GET URL is: " + url);
        logger.debug(function() {return "query: " + query});
        var self = this;
        var headers = {"Accept": "application/json"};
        if (options && (options.start >= 0 || options.count >= 0)) {
          var rangeStart = options.start || 0;
          var rangeEnd = (options.count && options.count !== Infinity) ? (rangeStart + options.count - 1) : "";
          headers["Range"] = "items=" + rangeStart + "-" + rangeEnd;
          //set X-Range for Opera since it blocks "Range" header (source: JsonRest)
          headers["X-Range"] = headers["Range"];
        }
        var loadPromise = request(
          url,
          {
            method: "GET",
            handleAs: "json",
            query: query,
            headers: headers,
            withCredentials: true,
            timeout: timeout || this.timeout
          }
        );
        var revivePromise = loadPromise.then(function(/*Array*/ data) {
          if (js.typeOf(data) !== "array") {
            throw new Error("expected array from remote call");
          }
          logger.debug("Retrieved successfully from server: " + data.length + " items");
          // the then Promise resolves with the resolution of the revive Promise, an Array
          return self.revive(data, referer); // return Promise
        });
        var totalPromise = loadPromise.response.then(
          function(response) {
            /*
             On response, we will read the "Content-Range" header.
             Security prohibits us from doing that, if the header is not mentioned in the "Access-Control-Expose-Headers" of the
             response. For that, we have to add it to the "Access-Control-Expose-Headers" on the server.
             */
            var range = response.getHeader("Content-Range");
            //noinspection AssignmentResultUsedJS
            return range && (range = range.match(/\/(.*)/)) && +range[1]; // nicked from JsonRest
          }
          // error handling in the other flow
        );
        // IDEA this approach freezes the UI in dgrid
        // Better would be to revive the elements of the array separately,
        // get a promise for each, and add to the store one at a time.
        // But that is not the same as loadAll, which also removes stuff _not_ in the server result.
        // Furthermore, then we don't use the feature that common secondary objects are only reloaded once.

        // no need to handle errors of revive: they are errors
        var storePromise = revivePromise.then(function(/*Array*/ revived) {
          //noinspection JSUnresolvedFunction
          var removed = result.loadAll(revived);
          /* Elements might be not PersistentObjects themselves, but a hash of PersistentObjects.
             If the element is an Object, but not a PersistentObject, we will try the properties of the object
             for PersistentObjects, and stop tracking those. */
          removed.forEach(function stopTrackingRecursive(r) {
            if (r && r.isInstanceOf && r.isInstanceOf(PersistentObject)) {
              if (referer) {
                self.stopTracking(r, referer);
              }
            }
            else if (js.typeOf(r) === "array") {
              r.forEach(function(el) {stopTrackingRecursive(el);});
            }
            else if (js.typeOf(r) === "object") {
              js.getAllKeys(r).forEach(function(key) {stopTrackingRecursive(r[key]);});
            }
            // else nop
          });
          //noinspection JSUndefinedPropertyAssignment
          result.total = totalPromise; // piggyback total promise on the store too
          return result; // return PersistentObjectStore|Observable(PersistentObjectStore)
        });
        // piggyback total promise on final Promise; since Promise is sealed, we need a delegate
        // remember that the Promise returns the store, not the array
        var finalPromise = self._piggyBackTotalPromise(storePromise, totalPromise);
        finalPromise.always(lang.hitch(self, self._optionalCacheReporting));
        return finalPromise; // return Promise
      },

      replacer: function(/*String*/ key, value) {
        // summary:
        //   When JSON-stringifying objects, this function is used as replacer
        //   (see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
        //   and http://jsfiddle.net/jandockx/BAzdq/).
        //   The this object is the object being stringified. First, we get an empty key, and the result
        //   of the object's `toJSON` as a whole, next, we get all properties of the result of this first call,
        //   as key-value pairs. The actual JSON value is what we return for each key.
        //   Inserting information thus can be done on the first call with the empty key, and can be based
        //   on the original object (this).
        // description:
        //   The default implementation always returns `value`, which essentially means it does nothing apart
        //   from using electricity.

        return value;
      },

      _poAction: function(/*String*/ method, /*PersistentObject*/ po, /*Any?*/ referer) {
        // summary:
        //   Ask the server to create or update po, track po on success,
        //   with referer, if provided.
        //   Returns a Promise.
        // method: String
        //   POST for create, PUT for update
        // description:
        //   The caller has a reference to po already. It is this object that will be reloaded
        //   with the result from the remote call, and thus "magically" have its properties changed,
        //   including the persistenceId on create.
        //   Since po is Stateful, listeners will be notified of this change.
        //   This means po can already be used.
        //
        //   The promise returns po after reload.
        //
        //   If anything fails during the request or revival of the response,
        //   the errback of the Promise is called with the exception. This can be a SemanticException.
        //   All other kinds of exceptions or value are to be considered errors.
        //
        //   Revive is also used for delete, although the deleted object cannot be found in the cache,
        //   since the JSON has no persistenceId anymore. This however will reload potential related
        //   objects.
        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return method === "POST" || method === "PUT";});
        this._c_pre(function() {return po;});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return po.isInstanceOf && po.isInstanceOf(PersistentObject);
        });

        var self = this;
        logger.debug(function() {return "Requested " + method + " of: " + po});
        var url = self.urlBuilder.get(method)(po);
        logger.debug(function() {return method + " URL is: " + url});
        var signal = new ActionCompleted({
          crudDao: self,
          action: method,
          subject: po, // might be changed for revived
          url: url
        });
        var revivePromise = request(url, {
            method: method,
            handleAs: "json",
            data: JSON.stringify(po, this.replacer),
            headers: {"Accept": "application/json"},
            withCredentials: true,
            timeout: this.timeout
          })
          .then(function(data) {
            logger.debug(function() {return method + " success in server: " + data});
            return self.revive(data, referer);
          })
          .then(function(revived) {
            signal.subject = revived;
            if (method === "POST") {
              signal.created = revived;
            }
            self._publishActionCompleted(signal);
            return revived;
          })
          .otherwise(lang.hitch(self, self._handleErrorInRetrieve, "_poAction - " + method, signal, po))
          .otherwise(lang.hitch(self, self._handleErrorInAction, "_poAction - " + method))
          .otherwise(function(exc) {
            if (exc.isInstanceOf && exc.isInstanceOf(SemanticException)) {
              //noinspection JSUnresolvedFunction
              logger.info(function() {return "SemanticException doing " + method + " for " + po.getKey() + ": " + exc.toString()});
            }
            else {
              //noinspection JSUnresolvedFunction
              logger.error(function() {return "Error doing " + method + " for " + po.getKey() + ": " + exc.message || exc}, exc);
            }
            self._publishActionCompleted(signal);
            throw exc;
          });
        revivePromise.always(lang.hitch(self, self._optionalCacheReporting)); // side track
        return revivePromise;
      },

      isOperational: function() {
        return this.urlBuilder && this.revive && this.cache;
      },

      getCachedByTypeAndId: function(/*String*/ serverType, /*Number*/ persistenceId) {
        // summary:
        //   gets a cached PersistentObject by serverType and id
        //   returns undefined or null if there is no such entry
        this._c_pre(function() {return js.typeOf(serverType) === "string";});
        // IDEA subtype of PersistentObject
        this._c_pre(function() {return js.typeOf(persistenceId) === "number";});

        //noinspection JSUnresolvedFunction
        return this.cache.getByTypeAndId(serverType, persistenceId);
      },

      track: function(/*IdentifiableObject*/ io, /*Object*/ referrer) {
        // summary:
        //   After this call, `io` will be in the cache, and be tracked by referrer.
        // description:
        //   If it was not in the cache yet, it is added, and referrer is added as referrer.
        //   If it was already in the cache, referrer is added as referrer.
        //   Since the referrers of a cache are a Set, there will be no duplicate entries.
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return io && io.isInstanceOf && io.isInstanceOf(IdentifiableObject);
        });
        this._c_pre(function() {return referrer;});

        //noinspection JSValidateTypes
        this.cache.track(io, referrer)
        this._optionalCacheReporting();
      },

      stopTracking: function(/*IdentifiableObject*/ io, /*Object*/ referer) {
        // summary:
        //   We note that referer no longer uses `io`.
        // description:
        //   If referer was the last referer of `io`, `io` is removed from the cache.
        //   If po is removed from the cache, it is also removed as a referer
        //   of all other entries (potentially resulting in removal from the cache
        //   of that entry, recursively).
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return io && io.isInstanceOf && io.isInstanceOf(IdentifiableObject);
        });
        this._c_pre(function() {return referer;});

        //noinspection JSUnresolvedFunction
        this.cache.stopTracking(io, referer);
        this._optionalCacheReporting();
      },

      stopTrackingAsReferer: function(/*Object*/ referer) {
        this._c_pre(function() {return referer;});

        //noinspection JSUnresolvedFunction
        this.cache.stopTrackingAsReferer(referer);
        this._optionalCacheReporting();
      },

      // _retrievePromiseCache: Object
      //   This hash avoids loading the same object twice at the same time.
      _retrievePromiseCache: null,

      _isRelevantIdNotFoundException: function(/*Object*/ exc, /*PersistentObject?*/ referencedObject) {
        //noinspection JSUnresolvedFunction
        return exc.isInstanceOf &&
               exc.isInstanceOf(IdNotFoundException) &&
               referencedObject &&
               referencedObject.get("persistenceId") === exc.persistenceId
      },

      _handleErrorInRetrieve: function(/*String*/ contextDescription,
                                        /*CrudDao.ActionCompleted*/ signal,
                                        /*PersistentObject?*/ referencedObject,
                                        err) {
        // summary:
        //   Use as a Promise.otherwise callback, with the first 3 arguments partially evaluated.
        //   `err` is handled, and added as `signal.exception`.
        //   If we detect an `IdNotFoundException` for the `referencedObject`,
        //   we return a Promise that cleans it up, and rejects with the handled exception.
        //   Else, we just throw the handled exception.

        //noinspection JSUnresolvedVariable,JSUnresolvedFunction
        var exc = this._handleException(
          err,
          contextDescription + " " + signal.url,
          referencedObject && referencedObject.getTypeDescription()
        );
        signal.exception = exc;
        if (this._isRelevantIdNotFoundException(exc, referencedObject)) {
          logger.debug("The referenced object has disappeared. Cleaning up.");
          this._cleanupAfterRemove(referencedObject, signal);
        }
        /* IDEA handle SecurityException here, as soon as we can get it in a debugger.
           We want a separate message for the user in CrudDaoNewsFlash, but we also
           want to treat it like a remove. So _cleanupAfterRemove, and
           where we close windows or refresh data, do that too. */
        throw exc;
      },

      _handleErrorInAction: function(/*String*/ contextDescription,
                                     exc) {
        // summary:
        //   `exc` must already be triaged, exception must be added to signal already

        if (exc.isInstanceOf && exc.isInstanceOf(ObjectAlreadyChangedException)) {
          //noinspection JSUnresolvedVariable
          logger.debug(function() {
            return "ObjectAlreadyChangedException while doing " + contextDescription + ". " +
                       "Refreshing the object that has changed with new data (" +
                       JSON.stringify(exc.newVersion) + ")"});
          // take care to do this for the object reported changed, not necessarily po
          //noinspection JSUnresolvedVariable
          return this.revive(exc.newVersion).then(function() {
            throw exc;
          });
        }
        throw exc;
      },

      retrieve: function(/*String*/ serverType, /*Number*/ persistenceId, /*Object?*/ referer, /*Boolean*/ force) {
        // summary:
        //   Get the object of type `serverType` with `persistenceId` from the remote server.
        //   This returns a Promise.
        // description:
        //   First we try to find the object in the cache. If we do find it, we check
        //   whether it was reloaded recently. If so, we return a Promise for this object
        //   that resolves immediately, and do not contact the server, unless force is true.
        //
        //   In an earlier version, we returned an empty object immediately, created
        //   from a provided constructor. However, it is very well possible to ask for an
        //   instance of an Interface or other superclass, and thus get a result of more
        //   specific dynamic type. We don't know in advance what type the result will be,
        //   so we have to wait to create the object, based on type information payload
        //   to support polymorphism.
        //
        //   The resulting object is finally in the cache, and will be tracked by referer.
        //   PersistentObjects and StoreOfStateful instances the main object refers to,
        //   will be cached with the objects that hold them as referer.
        //
        //   The object might be in the cache beforehand. If it is, the returned Promise
        //   resolves immediately (we want to avoid users to need to use `when`).
        //   In any case, we still ask the data for the object from the server, asynchronously.
        //   On successful return of the retrieval call, the object is reloaded with the new data.
        //   It will send events (if reload is implemented correctly).
        //
        //   In other words, the resulting promise resolves as soon as we have an object
        //   for you, but it might be reloaded soon afterwards, and change.
        //
        //   The remote retrieve might fail, with an error, or an `IdNotFoundException`.
        //   If the object was not in the cache, the `Promise` error function is called
        //   with an error or the `IdNotFoundException`.
        //   If the object was in the cache, and we receive an `IdNotFoundException`, it means
        //   the object was deleted from the server persistent storage since the last time we got
        //   an update. We set the persistenceId to null, and remove it from the cache as
        //   a tracked value and a referrer. Users should watch changes in persistenceId
        //   to react accordingly. This can happen at any time, BTW.
        //   If the object was in the cache, and we get a communication error, we only
        //   log it as a warning. The problem might be transient.
        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return js.typeOf(serverType) === "string";});
        this._c_pre(function() {return js.typeOf(persistenceId) === "number";});
        this._c_pre(function() {return !referer || js.typeOf(referer) === "object";});

        var /*CrudDao*/ self = this;
        logger.debug("Requested GET of: '" + serverType + "' with id '" + persistenceId + "'");
        var cacheKey = serverType + "@" + persistenceId;
        //noinspection JSUnresolvedVariable
        var /*Promise*/ resultPromise = self._retrievePromiseCache[cacheKey];
        if (resultPromise) {
          logger.debug("Already loading " + cacheKey + "; returning existing promise.");
          return resultPromise;
        }
        //noinspection JSUnresolvedFunction
        var cached = self.getCachedByTypeAndId(serverType, persistenceId);
        if (cached) {
          logger.debug("Found cached version (" + cacheKey + ")");
          if (referer) {
            // track now, early; if we wait until reload, it might be removed from the cache already
            //noinspection JSUnresolvedFunction
            self.track(cached, referer);
            /* IDEA this needs to be guarded?; referer might stop tracking before the reload Promise resolves;
             that results in a memory leak? */
          }
          if (!force) {
            logger.debug("Found cached version, and should not be forced: resolving Promise immediately " +
                         "(will reload if stale) (" + cacheKey + ")");
            var deferred = new Deferred();
            deferred.resolve(cached);
            resultPromise = deferred.promise;
          }
        }
        //noinspection JSUnresolvedVariable
        var stale = cached && (Date.now() - cached.lastReloaded.getTime() > CrudDao.durationToStale);
        if (force || !cached || stale) { // not recently reloaded
          logger.debug("Force reload requested, not found in cache or cached version is stale. " +
                       "Getting '" + serverType + "' with id '" + persistenceId + "' from server.");
          //noinspection JSUnresolvedVariable
          var url = self.urlBuilder.retrieve(serverType, persistenceId);
          logger.debug("GET URL is: " + url);
          //noinspection JSUnresolvedFunction
          var executed = self._queued(function() {
            var signal = new ActionCompleted({
              crudDao: self,
              action: "GET",
              subject: cached, // might still be changed to po, if no error
              url: url
            });
            //noinspection JSUnresolvedVariable
            var loadedAndRevived = request
              .get(
                url,
                {
                  handleAs: "json",
                  headers: {"Accept": "application/json"},
                  preventCache: true,
                  withCredentials: true,
                  timeout: self.timeout
                }
              )
              .then(function(data) {
                logger.debug("Retrieved successfully from server (" + cacheKey + ")");
                //noinspection JSUnresolvedFunction
                return self.revive(data, referer); // errors are true errors
              })
              .then(function(po) {
                logger.debug("Retrieve finalized (nominal). Forgetting the retrieve Promise (" + cacheKey + ")");
                delete self._retrievePromiseCache[cacheKey];
                signal.subject = po;
                self._publishActionCompleted(signal);
                //noinspection JSUnresolvedVariable
                return po;
              })
              .otherwise(lang.hitch(self, self._handleErrorInRetrieve, "retrieve - GET", signal, cached))
              .otherwise(function(err) {
                // no need to handle errors of revive: they are errors
                logger.debug("Retrieve finalized (exceptional). Forgetting the retrieve Promise (" + cacheKey + ")");
                //noinspection JSUnresolvedVariable
                delete self._retrievePromiseCache[cacheKey];
                self._publishActionCompleted(signal);
                throw err;
              });
            loadedAndRevived.then(lang.hitch(self, self._optionalCacheReporting)); // side track
            return loadedAndRevived;
          });
          //noinspection JSUnresolvedVariable
          self._retrievePromiseCache[cacheKey] = executed;
          resultPromise = resultPromise || executed;
        }
        /*
         !!resultPromise
         === (cached && !force) || (force || !cached || stale)
         === (cached || force || !cached || stale) && (!force || force || !cached || stale)
         === (force || stale || true) && (!cached || stale || true)
         === true && true
         === true
         */
        return resultPromise;
      },

      create: function(/*PersistentObject*/ po, /*Any*/ referer) {
        // summary:
        //   Ask the server to create po.
        //   Returns a Promise for a fresh object that is tracked with referer as the first referer.
        //   The original object should be discarded.
        // description:
        //   po must have po.get("persistenceId") === null on call.
        //   The promise returns a fresh object after reload.
        //   The caller has a reference to po, but this should be discarded on Promise fulfilment, and replaced
        //   with the result.
        //   IDEA We could change the code to reuse po, but the issue is that po could contain references to other
        //   objects that need to be created too, and the reviver currently has no mechanism to do that, but it is
        //   an interesting idea.
        //
        //   If anything fails during the request or revival of the response,
        //   the errback of the Promise is called with the exception. This can be a SemanticException.
        //   All other kinds of exceptions or value are to be considered errors.
        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return po;});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return po.isInstanceOf && po.isInstanceOf(PersistentObject);
        });
        this._c_pre(function() {
          //noinspection JSUnresolvedFunction
          return po.get("persistenceId") === null;
        });
        this._c_pre(function() {return referer;});

        return this._poAction("POST", po, referer);
      },

      update: function(/*PersistentObject*/ po) {
        // summary:
        //   Ask the server to update po.
        //   Returns a Promise.
        // description:
        //   po must have po.get("persistenceId") !== null on call.
        //   The caller has a reference to po already. It is this object that will be reloaded
        //   with the result from the remote call, and thus "magically" have its properties changed,
        //   including the persistenceId.
        //   Since po is Stateful, listeners will be notified of this change.
        //   This means po can already be used.
        //
        //   The promise returns po after reload.
        //
        //   If anything fails during the request or revival of the response,
        //   the errback of the Promise is called with the exception. This can be a SemanticException.
        //   All other kinds of exceptions or value are to be considered errors.
        var thisObject = this;
        this._c_pre(function() {return thisObject.isOperational();});
        this._c_pre(function() {return po;});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return po.isInstanceOf && po.isInstanceOf(PersistentObject);
        });
        this._c_pre(function() {
          //noinspection JSUnresolvedFunction
          return po.get("persistenceId");
        });

        return this._poAction("PUT", po);
      },

      _cleanupAfterRemove: function(/*PersistentObject*/ po, /*ActionCompleted*/ signal) {
        // summary:
        //   The rest of the graph returned by the server cannot be trusted to be up to date after delete.
        //   The server might have cascaded delete. Related objects on this side could still hold a reference
        //   to the deleted object, which is removed in the mean time in the server.
        //   Therefor, we do not revive the result, but instead stop tracking po, and retrieve fresh data
        //   for all related elements if they are still cached.
        //   Signal is changed synchronously as needed, but not published yet.
        this._c_pre(function() {return po;});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return po.isInstanceOf && po.isInstanceOf(PersistentObject);
        });

        var self = this;
        //noinspection JSUnresolvedFunction
        var key = po.getKey();
        //noinspection JSUnresolvedFunction
        self.cache.stopTrackingCompletely(po);
        // signal deletion
        signal.disappeared = po;
        //noinspection JSUnresolvedFunction
        po._changeAttrValue("persistenceId", null);
        //noinspection JSUnresolvedFunction
        if (po.get("persistenceVersion")) {
          //noinspection JSUnresolvedFunction
          po._changeAttrValue("persistenceVersion", null);
        }
        //noinspection JSUnresolvedFunction
        if (po.get("createdBy")) {
          //noinspection JSUnresolvedFunction
          po._changeAttrValue("createdBy", null);
          //noinspection JSUnresolvedFunction
          po._changeAttrValue("createdAt", null);
        }
        //noinspection JSUnresolvedFunction
        if (po.get("lastModifiedBy")) {
          //noinspection JSUnresolvedFunction
          po._changeAttrValue("lastModifiedBy", null);
          //noinspection JSUnresolvedFunction
          po._changeAttrValue("lastModifiedAt", null);
        }
        // If po disappeared, probably objects in the neighborhood are changed too, and possibly disappeared too.
        // Some of those might be in the cache. Refresh them.
        // We are possibily dealing with a SemanticException, we want reported. We cannot report any exception that
        // might happen during refresh. We will do this in the background, and log.
        // Note that this might go recursive if we find other objects that have disappeared.
        var relatedCachedPos = js.getAllKeys(po).reduce(
          function(acc, k) {
            var candidatePo = po[k];
            if (candidatePo &&
                candidatePo.isInstanceOf &&
                candidatePo.isInstanceOf(PersistentObject) &&
                candidatePo.get("persistenceId") &&
                self.cache.get(candidatePo)) {
              acc.push(candidatePo);
            }
            return acc;
          },
          []
        );
        logger[relatedCachedPos.length ? "info" : "debug"](
          function() {
            return "Related cached persistent objects to refresh in response " +
                                                           "to disappearance of " + key + ": " +
                                                           relatedCachedPos.length}
        );
        all(relatedCachedPos.map(function(rcpo) {
          logger.info("Refreshing " + rcpo.getKey() + " in background because " + key + " disappeared.");
          return self
            .retrieve(rcpo.getTypeDescription(), rcpo.get("persistenceId"), null, true)
            // This will update objects in cache, but don't add a referer for my sake. Force.
            .otherwise(function(err) {
              logger.warn("Error during background refresh of " + rcpo.getKey() +
                           " in response to disappearance of " + key);
              throw err;
            })
            .then(function(refreshed) {
              logger.info("Succesful background refresh of " + rcpo.getKey() +
                          " in response to disappearance of " + key);
              return refreshed;
            });
        })).always(function() {
          logger.info("Background refresh in response " + "to disappearance of " + key + " done.");
        });
        return po;
      },

      remove: function(/*PersistentObject*/ po) {
        // summary:
        //   Ask the server to delete po.
        //   Returns a Promise.
        //   This call removes p from the cache, and removes p as referer to other objects from the cache.
        //   Upon completion, po.get("persistenceId") === null
        // description:
        //   po must have po.get("persistenceId") !== null on call.
        //   The caller has a reference to po already. It is this object that will be reloaded
        //   with the result from the remote call, and thus "magically" have its properties changed,
        //   including the persistenceId.
        //   Since po is Stateful, listeners will be notified of this change.
        //   This means po can already be used.
        //
        //   The rest of the graph returned by the server cannot be trusted to be up to date in this case.
        //   Therefor, we do not revive the result, but instead stop tracking po, and retrieve fresh data
        //   for all related elements if they are still cached.
        //
        //   The promise returns po after reload.
        //
        //   If anything fails during the request or revival of the response,
        //   the errback of the Promise is called with the exception. This can be a SemanticException.
        //   All other kinds of exceptions or value are to be considered errors.
        var thisObject = this;
        this._c_pre(function() {return thisObject.isOperational();});
        this._c_pre(function() {return po;});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return po.isInstanceOf && po.isInstanceOf(PersistentObject);
        });
        this._c_pre(function() {
          //noinspection JSUnresolvedFunction
          return po.get("persistenceId");
        });

        var self = this;
        logger.debug(function() {return "Requested DELETE of: " + po});
        var url = self.urlBuilder.get("DELETE")(po);
        logger.debug("DELETE URL is: " + url);
        var signal = new ActionCompleted({
          crudDao: self,
          action: "DELETE",
          subject: po,
          url: url
        });
        var key = po.getKey();
        var deletePromise = request
          .del(url, {
            handleAs: "json",
            data: JSON.stringify(po, self.replacer),
            headers: {"Accept" : "application/json"},
            withCredentials: true,
            timeout: self.timeout
          })
          .otherwise(function(err) {
            var exc = self._handleException(err, "remove - DELETE - " + url, po.getTypeDescription()); // of the request
            signal.exception = exc; // also mention IdNotFoundException
            if (self._isRelevantIdNotFoundException(exc, po)) {
                // IdNotFoundException is sad, and might be mentioned to the user, but not a problem; it is what we want
              return po; // make it nominal
            }
            throw exc;
          })
          .then(function() {
            logger.debug("DELETE success in server or already deleted: " + key);
            return self._cleanupAfterRemove(po, signal);
          })
          .then(function(po) {
            self._publishActionCompleted(signal);
            return po;
          })
          .otherwise(lang.hitch(self, self._handleErrorInAction, "remove - DELETE"))
          .otherwise(function(err) {
            logger.error(function() {return "Error deleting " + key + ": " + err.message || err}, err);
            self._publishActionCompleted(signal);
            throw err;
          });
        deletePromise.always(lang.hitch(self, self._optionalCacheReporting)); // side track
        return deletePromise;
      },

      retrieveToMany: function(/*PersistentObject*/ po, /*String*/ propertyName, /*Object?*/ referer, /*Object?*/ options) {
        // summary:
        //   Load the objects of a to-many relationship from the remote server.
        //   These are the many objects of `po[propertyName]`.
        //   This returns the Promise of the filled-out Observable(PersistentObjectStore) found at `po[propertyName]`.
        //   The resulting objects are tracked, with the `po[propertyName]` as referer.
        // po: PersistentObject
        //   po should be in the cache beforehand
        // serverPropertyName: String
        //   The name of the to-many property of `po`.
        // options: Object?
        //   Optional options object. We only use the paging settings:
        //   - options.start: Number?: The index of the first result we expect. Default is 0 (0-based counting)
        //   - options.count: Number?: The number of objects we request, starting from `start`. The server might return less,
        //                             if there are no more, or if it decides to return less (e.g., because the server
        //                             return count is capped to a lower number).
        //   We expect a consistent sorting order on the server for paging.
        // description:
        //   Asynchronously, we get up-to-date content from the server, and will
        //   update the content of the store when the server returns a response.
        //   The store will send events (if reload is implemented correctly).
        //
        //   This code expects to find at `po[propertyName]` an Observable ToManyStore.
        //   We use the store we find.
        //
        //   The remote retrieve might fail, with an error, or an `IdNotFoundException`, or a
        //   `SecurityException`.

        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {return po;});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return po.isInstanceOf && po.isInstanceOf(PersistentObject);
        });
        this._c_pre(function() {
          //noinspection JSUnresolvedFunction
          return po.get("persistenceId");
        });
        // po should be in the cache, but we don't enforce it; your problem
        this._c_pre(function() {return js.typeOf(propertyName) === "string";});
        this._c_pre(function() {return po[propertyName] && po[propertyName].query;});
        // this._c_pre(function() {return po[propertyName] && po[propertyName].isInstanceOf && po[propertyName].isInstanceOf(ToManyStore)});
        // Cannot really formulate what we want, because of stupid Observable Store wrapper
        this._c_pre(function() {return !referer || js.typeOf(referer) === "object";});

        var self = this;
        logger.debug(function() {return "Requested GET of to many: '" + po + "[" + propertyName+ "]'"});
        var store = po[propertyName];
        if (referer) {
          self.track(store, referer);
        } // else nop
        //noinspection JSUnresolvedFunction
        var url = self.urlBuilder.toMany(po.getTypeDescription(), po.get("persistenceId"), store.serverPropertyName);
        //noinspection JSUnresolvedFunction
        var guardKey = po.getKey() + "." + propertyName;
        logger.debug("Refreshing to many store for " + guardKey);
        var guardedPromise = store._arbiter.guard(
          guardKey,
          lang.hitch(
            self,
            self._queued,
            function() { // return Promise
              logger.debug("Starting actual GET of to many for" + guardKey + ".");
              var signal = new ActionCompleted({
                crudDao: self,
                action: "GET",
                subject: store, // might still be changed to po, if no error
                url: url
              });
              var refreshed = self._refresh(store, url, null, store, options, self.toManyTimeout); // IDEA: we can even add a query here
              var handledRefreshed = refreshed
                .then(function(result) {
                  logger.debug("To-many store for " + guardKey + " refreshed.");
                  result.set("lastReloaded", new Date());
                  self._publishActionCompleted(signal);
                  return result;
                })
                .otherwise(lang.hitch(self, self._handleErrorInRetrieve, "retrieveToMany - GET", signal, po))
                .otherwise(function(err) {
                  self._publishActionCompleted(signal);
                  throw err;
                });
              return self._piggyBackTotalPromise(handledRefreshed, refreshed.total);
            }
          ),
          true
        );
        return guardedPromise;
      },

      searchInto: function(/*PersistentObjectStore*/ result, /*String?*/ serverType, /*Object?*/ query, /*Object?*/ options) {
        // summary:
        //   Get all the objects of type `serverType` given the query from the remote server,
        //   and update `result` to reflect the returned collection when an answer arrives.
        //   This returns a Promise, that resolves to result.
        //   *The resulting objects are not tracked.*
        // result: PersistentObjectStore
        //   Mandatory. When the promise is resolved, it will contain exactly the objects that were returned.
        // serverType: String?
        //   Optional.
        // query: Object?
        //   Optional. The semantics of these parameters are left to the server.
        // options: Object?
        //   Optional options object. We only use the paging settings:
        //   - options.start: Number?: The index of the first result we expect. Default is 0 (0-based counting)
        //   - options.count: Number?: The number of objects we request, starting from `start`. The server might return less,
        //                             if there are no more, or if it decides to return less (e.g., because the server
        //                             return count is capped to a lower number). Default is as many as possible.
        //   We expect a consistent sorting order on the server for paging.
        // description:
        //   The objects might be in result or the cache beforehand. Those objects are reloaded,
        //   and might send changed events.
        //
        //   The remote retrieve might fail, with an error, which is returned by the errback
        //   of the returned Promise. In that case, `result` is left unchanged.
        //
        //   A search for a specific `serverType` without a `query` should return all
        //   objects of that type.
        this._c_pre(function() {return this.isOperational();});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable
          return result && result.isInstanceOf;
        });
        // Cannot really formulate what we want, because of stupid Observable Store wrapper
        // this._c_pre(function() {return result && result.isInstanceOf && result.isInstanceOf(StoreOfStateful);});
        this._c_pre(function() {return !serverType || js.typeOf(serverType) === "string";});
        this._c_pre(function() {return !query || js.typeOf(query) === "object";});
        this._c_pre(function() {return !options || js.typeOf(options) === "object";});

        var self = this;
        logger.debug(function() {return "Requested GET of matching instances: '" + serverType +"' matching '" + query + "'"});
        var url = self.urlBuilder.retrieveAll(serverType, query);
        var refreshed = self._refresh(result, url, query, result, options); // no referer; has total
        return self._piggyBackTotalPromise(
          refreshed.otherwise(function(err) {
            throw self._handleException(err, "searchInto - GET " + url); // of the request
          }),
          refreshed.total
        ) ;
      },

      retrieveAllPersistenceIds: function(/*String*/ serverType) {
        // summary:
        //   Returns the Promise of an array with all the persistenceIds that
        //   exist for the given serverType.
        this._c_pre(function() {return js.typeOf(serverType) === "string";});

        logger.debug("Requested GET of all persistenceIds of " + serverType);
        var url = this.urlBuilder.allPersistenceIds(serverType);
        var loadPromise = request(
          url,
          {
            method:"GET",
            handleAs:"json",
            headers:{"Accept":"application/json"},
            preventCache: true,
            withCredentials: true,
            timeout: this.timeout
          }
        );
        loadPromise.then(lang.hitch(this, this._optionalCacheReporting));
        return loadPromise; // return Promise
      }

    });

    CrudDao.ActionCompleted = ActionCompleted;
    //noinspection MagicNumberJS
    CrudDao.durationToStale = 60000; // 1 minute
    CrudDao.mid = module.id;

    /*=====
    var Change = {

      // action: String
      //   The HTTP method that just concluded (POST, PUT or DELETE).
      action: false,

      // persistentObject: PersistentObject
      //   The revived PersistentObject that was a result of the action.
      persistentObject: burstStarted,
    };

    CrudDao.Change = Change;
    =====*/

    return CrudDao; // return Function
  }
);
