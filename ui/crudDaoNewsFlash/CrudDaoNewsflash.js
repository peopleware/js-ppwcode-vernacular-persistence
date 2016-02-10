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

define(["dojo/_base/declare", "ppwcode-util-oddsAndEnds/ui/newsFlash/NewsFlash",
        "../../CrudDao", "ppwcode-util-oddsAndEnds/js",
        "ppwcode-vernacular-exceptions/SemanticException", "ppwcode-vernacular-persistence/IdNotFoundException",
        "dojo/i18n!./nls/crudDaoNewsFlash",
        "ppwcode-util-oddsAndEnds/log/logger!", "module"],
  function(declare, NewsFlash,
           CrudDao, js,
           SemanticException, IdNotFoundException,
           crudDaoNewsFlash,
           logger, module) {

    var CrudDaoNewsFlash = declare([NewsFlash], {
      // summary:
      //   Widget that, placed anywhere in a screen (but probably best at the top level)
      //   shows flash messages about CRUD-operations performed by CrudDao.

      constructor: function() {
        this.topics.push(CrudDao.mid);
      },

      // translate: Function CrudDao.ActionCompleted -> Message?
      translate: function(/*CrudDao.ActionCompleted*/ actionCompleted) {
        if (!actionCompleted ||
            !actionCompleted.isInstanceOf ||
            !actionCompleted.isInstanceOf(CrudDao.ActionCompleted)) {
          return;
        }

        logger.debug("Received an event from CrudDao: ", actionCompleted.toString());
        // IDEA a way to check for events of a particular CrudDao, instead of any CrudDao
        //if (actionCompleted.crudDao !== this) {
        //  logger.debug("Event came from a different CrudDao. Ignore.");
        //  return;
        //}

        if (!actionCompleted.exception) {

          if (actionCompleted.action === "GET") {
            logger.debug("Event reports a successful GET, which we will not trouble the user with.");
            return;
          }

          if (actionCompleted.action === "DELETE") {
            if (!actionCompleted.disappeared || actionCompleted.disappeared !== actionCompleted.subject) {
              logger.warn("Event signalled successful DELETE, but had no disappeared. Showing no feedback.");
              return;
            }
            logger.debug("Event signalled successful DELETE. Showing confirmation.");
          }
          if (actionCompleted.action === "POST") {
            if (!actionCompleted.created || actionCompleted.created !== actionCompleted.subject) {
              logger.warn("Event signalled successful POST, but had no created. Showing no feedback.");
              return;
            }
            logger.debug("Event signalled successful POST. Showing confirmation.");
          }
          if (actionCompleted.action === "PUT") {
            logger.debug("Event signalled successful PUT. Showing confirmation.");
          }

          // invar guarantees subject is a PersistentObject, and thus has getLabel
          return {
            level: NewsFlash.Level.CONFIRMATION,
            html: js.substitute(crudDaoNewsFlash[actionCompleted.action], actionCompleted.subject)
          };
        }

        if (!actionCompleted.exception.isInstanceOf || !actionCompleted.exception.isInstanceOf(SemanticException)) {
          logger.debug("Event signals an error. We are not showing unhandled errors here. NOP.");
          return;
        }

        logger.debug("Event signals a SemanticException. We want to notify the user, or request interaction.");
        if (actionCompleted.exception.isInstanceOf(IdNotFoundException)) {
          logger.debug("Event signals IdNotFoundException.");
          var result = {level: NewsFlash.Level.NOTIFICATION};
          if (actionCompleted.disappeared) {
            logger.debug("Event signals IdNotFoundException, and the object that has disappeared is here (~ in the cache).");
            result.html = js.substitute(
              crudDaoNewsFlash[actionCompleted.exception.constructor.mid],
              actionCompleted.disappeared
            );
          }
          else {
            logger.debug("Event signals IdNotFoundException, and the object that has disappeared is not known.");
            result.html = js.substitute(crudDaoNewsFlash[IdNotFoundException.mid + "/UNKNOWN OBJECT"], actionCompleted);
          }
          return result;
        }

        logger.debug("Event signals generic SemanticException.");
        var messageKey = actionCompleted.exception.constructor.mid + "[" + actionCompleted.exception.key + "]";
        var messageTemplate = crudDaoNewsFlash[actionCompleted.exception.constructor.mid
                                               + "[" + actionCompleted.exception.key + "]"];
        if (!messageTemplate) {
          messageTemplate = crudDaoNewsFlash[SemanticException.mid + "[" + actionCompleted.exception.key + "]"];
        }
        if (!messageTemplate) {
          messageTemplate = crudDaoNewsFlash[actionCompleted.exception.constructor.mid];
        }
        if (!messageTemplate) {
          messageTemplate = crudDaoNewsFlash[SemanticException.mid];
        }
        return {level: NewsFlash.Level.ADVISE, html: js.substitute(messageTemplate, actionCompleted)};
      }

    });

    CrudDaoNewsFlash.mid = module.id;

    return CrudDaoNewsFlash;
  }
);
