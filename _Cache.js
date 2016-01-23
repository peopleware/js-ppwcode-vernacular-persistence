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
        "ppwcode-vernacular-semantics/IdentifiableObject", "ppwcode-util-collections/ArraySet", "./PersistentObject",
        "./ToManyStore",
        "ppwcode-util-oddsAndEnds/js", "ppwcode-util-oddsAndEnds/log/logger!"],
  function(declare,
           _ContractMixin,
           IdentifiableObject, Set, PersistentObject, ToManyStore,
           js, logger) {

    var Entry = declare([_ContractMixin], {
      // summary:
      //   Helper class for _Cache. Defines the cache entries, and methods to deal with it.
      // description:
      //   In the absence of some form of weak reference in JavaScript (promised for ECMAScript 6 / Harmony,
      //   see <http://wiki.ecmascript.org/doku.php?id=harmony:harmony>), we use reference tracking to be
      //   able to release instances from the cache.

      _c_invar: [
        function() {return this._c_prop_mandatory("payload");},
        function() {return this.payload.isInstanceOf && this.payload.isInstanceOf(IdentifiableObject);},
        function() {return this.payload.getKey() !== null;},
        function() {return this.getNrOfReferers() >= 0;}
      ],

      // payload: IdentifiableObject
      //   Reference to the IdentifiableObject this is an entry for.
      //   This can never change.
      payload: null,

      // _referers: Set
      //   The set of referers.
      // tags:
      //   private
      _referers: null,

      // _createdAt: Date
      //    The time of creation of this entry.
      // tags:
      //    readonly
      // description:
      //    introduced to do memory leak detection
      createdAt: null,

      constructor: function(/*IdentifiableObject*/ io, /*_Cache*/ cache) {
        this._c_pre(function() {return io;});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return io.isInstanceOf && io.isInstanceOf(IdentifiableObject);
        });
        this._c_pre(function() {return io.getKey() !== null;});
        this._c_pre(function() {return cache;});

        this.payload = io;
        //noinspection JSUnresolvedFunction
        if (io.isInstanceOf(PersistentObject)) {
          //noinspection JSUnresolvedFunction
          var watcher = io.watch("persistenceId", function(propertyName, oldValue, newValue) {
            if (!newValue) {
              watcher.unwatch();
              watcher = null;
              cache.stopTrackingCompletely(io);
            }
          });
        }
        this._referers = new Set();
        this.createdAt = new Date();
      },

      addReferer: function(/*Object*/ referer) {
        // summary:
        //   Adds a referer to the set of referers. If referer is already
        //   in the set, nothing happens.
        // description:
        //   Referer can be anything, but usually it is a reference to
        //   the object holding a reference to `payload`, or otherwise
        //   responsible for maintaining this reference (i.e., releasing it
        //   when no longer needed, for garbage collection).
        this._c_pre(function() { return referer !== null;});

        this._referers.add(referer);
      },

      removeReferer: function(/*Object*/ referer) {
        // summary:
        //   Removes a referer from the set referers. If referer is
        //   not in the set to begin with, nothing happens.

        this._referers.remove(referer);
      },

      getNrOfReferers: function() {
        // summary:
        //   Return the number of referers.

        return this._referers.getSize(); // return Number
      },

      report: function() {
        return {payload: this.payload, createdAt: this.createdAt, nrOfReferers: this._referers.getSize()};
      },

      detailedReport: function() {
        return {payload: this.payload, createdAt: this.createdAt, referers: this._referers.toJson()};
      }

    });

    //noinspection LocalVariableNamingConventionJS
    var _Cache = declare([_ContractMixin], {
      // summary:
      //   Cache for IdentifiableObject instances.
      //   Instances are cached with a referer. Subsequent track-commands add new referers.
      //   When the cache is asked to stop tracking an object, it also removes the object it stops
      //   tracking as a referer everywhere.
      //   When there are no more referers for a given instance, it is removed from the cache, recursively.
      //   If the instance is a ToManyStore, it is disabled of it is no longer tracked.
      // description:
      //   In the absence of some form of weak reference in JavaScript (promised for ECMAScript 6 / Harmony,
      //   see <http://wiki.ecmascript.org/doku.php?id=harmony:harmony>), we use reference tracking to be
      //   able to release instances from the cache.
      //
      //   The cache is *not* responsible for caching deep. Only the offered object is cached
      //   with the given referer.

      _c_invar: [
        {
          condition: function() {return true;},
          selector: function() {return this._data;},
          invars: [
            function() {return this.isInstanceOf && this.isInstanceOf(Entry);}
          ]
        }
      ],

      // _data: Object
      //    Hash for the cache Entry instances
      //    The keys are getKey() for IdentifiableObject
      _data: null,

      // _typeCrossReference: Object
      //    Hash of type names, mentioning all the subtypes we know already.
      //    This way, if we look for an instance of A in the cache, we can also look for subtypes of A.
      //    Each entry is an array of direct subtypes.
      _typeCrossReference: null,

      // extraOnRemove: Function?
      //   IdentifiableObject x Cache --> undefined
      //   Optional. If here, this function is called when an entry disappears from the trash.
      _extraOnRemove: null,

      constructor: function(/*Function?*/ extraOnRemove) {
        // extraOnRemove: Function?
        //   IdentifiableObject x Cache --> undefined
        //   Optional. If here, this function is called when an entry disappears from the trash.

        this._data = {};
        this._typeCrossReference = {};
        if (extraOnRemove) {
          this._extraOnRemove = extraOnRemove;
        }
      },

      _track: function (/*String*/ key, /*IdentifiableObject*/ io, /*Object*/ referer) {
        this._c_pre(function() {return js.typeOf(key) === "string";});
        this._c_pre(function() {return io;});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return io.isInstanceOf && io.isInstanceOf(IdentifiableObject);
        });
        this._c_pre(function() {return referer;});

        this._buildTypeCrossReference(io.constructor);
        var /*Entry*/ entry = this._data[key];
        if (!entry) {
          entry = new Entry(io, this);
          this._data[key] = entry;
          if (logger.isInfoEnabled()) {
            var numberOfEntries = Object.keys(this._data).length;
            logger.info("Entry added to cache (" + numberOfEntries + "): " + io.toString());
          }
        }
        entry.addReferer(referer);
      },

      _getPayload: function(key) {
        //noinspection JSUnresolvedVariable
        return this._data[key] && this._data[key].payload; // return IdentifiableObject
      },

      stopTrackingAsReferer: function(referer) {
        var self = this;
        Object.keys(this._data).forEach(function(key) {
          /* Concurrent modification: by the time we get here, the entry might no longer
             exist (removed by an earlier branch of this backtrack). That is no problem
             though, because we have if (entry) above. */
          self._removeReferer(key, referer);
        });
      },

      _removeReferer: function(/*String*/ key, /*Object*/ referer) {
        // summary:
        //   Remove referer as referer to the payload of the entry with `key`
        //   (if that exists).
        //   If, by this removal, there are no more referers for that payload,
        //   remove the entry from the cache, and remove its payload as referer
        //   from all other entries (recursively).
        //   If the removed entry is a ToManyStore, it is disabled.
        this._c_pre(function() {return js.typeOf(key) === "string";});
        this._c_pre(function() {return referer;});

        var self = this;
        var /*Entry*/ entry = self._data[key];
        if (entry) {
          entry.removeReferer(referer);
          if (entry.getNrOfReferers() <= 0) {
            delete self._data[key];
            if (logger.isInfoEnabled()) {
              var numberOfEntries = Object.keys(self._data).length;
              logger.info("Entry removed from cache (" + numberOfEntries + "): " + entry.payload.toString());
            }
            if (entry.payload.isInstanceOf(ToManyStore)) {
              logger.info("Entry was ToManyStore " + key + ". Disabling.");
              entry.payload.removeAll();
              entry.payload.set("lastReloaded", null);
            }
            // now, if payload was itself a referer, we need to remove if everywhere as referer
            self.stopTrackingAsReferer(entry.payload);
            if (self._extraOnRemove) {
              self._extraOnRemove(entry.payload, self);
            }
          }
        }
// IDEA: code below looks like a very good idea indeed, but it doesn't work; we "loose" entries this way
// (Demonstration in current project: dnd a component of an LSD to change the order; each time, we loose some dereferenced raw materials)
//        if (entry) {
//          entry.removeReferer(referer);
//          setTimeout(
//            function() { // wait a moment; we might need the data again in a second; we can take our time to clean the cache
//              var entry = self._data[key]; // again; entry might have been removed already
//              if (entry && entry.getNrOfReferers() <= 0) {
//                delete self._data[key];
//                if (logger.isInfoEnabled()) {
//                  var numberOfEntries = Object.keys(self._data).length;
//                  logger.info("Entry removed from cache (" + numberOfEntries + "): " + entry.payload.toString());
//                }
//                // now, if payload was itself a referer, we need to remove if everywhere as referer
//                self.stopTrackingAsReferer(entry.payload);
//                if (self._extraOnRemove) {
//                  self._extraOnRemove(entry.payload, self);
//                }
//              }
//            },
//            2500
//          );
//        }
      },

      getByTypeAndId: function(/*String*/ serverType, /*Number*/ persistenceId) {
        // summary:
        //   gets a cached PersistentObject by serverType and id
        //   returns undefined or null if there is no such entry
        this._c_pre(function() {return js.typeOf(serverType) === "string";});
        // IDEA subtype of PersistentObject
        this._c_pre(function() {return js.typeOf(persistenceId) === "number";});

        // We have a crossReference. We need to test keys for serverType and all its subtypes
        // (that we know of).
        var self = this;
        //noinspection JSUnresolvedVariable
        return self._typeCrossReference[serverType] &&
               self._typeCrossReference[serverType].reduce(
                 function(acc, poTypeDescription) {
                   //noinspection JSUnresolvedFunction
                   var key = PersistentObject.keyForId(poTypeDescription, persistenceId);
                   //noinspection JSUnresolvedFunction
                   return self._getPayload(key) || acc; // return IdentifiableObject, most concrete type
                 },
                 undefined
               );
      },

      getByKey: function(/*String*/ key) {
        // summary:
        //   gets a cached PersistentObject by key
        //   returns undefined or null if there is no such entry
        this._c_pre(function() {return js.typeOf(key) === "string";});

        return this._getPayload(key); // return IdentifiableObject
      },

      get: function(/*IdentifiableObject*/ io) {
        // summary:
        //   gets a cached IdentifiableObject for a given `io`
        //   returns undefined if there is no such entry
        this._c_pre(function() {return io;});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return io.isInstanceOf && io.isInstanceOf(IdentifiableObject);
        });
        this._c_pre(function() {return io.getKey();});

        var key = io.getKey();
        return this._getPayload(key); // return IdentifiableObject
      },

      track: function(/*IdentifiableObject*/ io, /*Object*/ referer) {
        // summary:
        //   After this call, io will be in the cache, and be tracked by referer.
        // description:
        //   If it was not in the cache yet, it is added, and referer is added as referer.
        //   If it was already in the cache, referer is added as referer.
        //   Since the referers of a cache are a Set, there will be no duplicate entries.
        //
        //   This does nothing for properties of io. We do not go deep.
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return io && io.isInstanceOf && io.isInstanceOf(IdentifiableObject);
        });
        this._c_pre(function() {return io.getKey();});
        this._c_pre(function() {return referer;});

        var key = io.getKey();
        this._track(key, io, referer);
      },

      _lookupKeyOf: function (io) {
        var key = io.getKey();
        if (!key) {
          // it can already be deleted from the server, and then persistenceId is null
          // we need to travel all entries
          var keys = Object.keys(this._data);
          for (var i = 0; i < keys.length; i++) {
            //noinspection JSUnresolvedVariable
            if (this._data[keys[i]].payload === io) {
              key = keys[i];
              //noinspection BreakStatementJS
              break;
            }
          }
        }
        return key;
      },

      stopTracking: function(/*IdentifiableObject*/ io, /*Object*/ referer) {
        // summary:
        //   We note that referer no longer uses io.
        // description:
        //   If referer was the last referer of io, io is removed from the cache.
        //   If io is removed from the cache, it and all its LazyToManyStore property values
        //   are also removed as a referer of all other entries (potentially resulting in
        //   removal from the cache of that entry, recursively).
        //
        //   This also works if io doesn't have a key (anymore).
        this._c_pre(function() {return io;});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return io.isInstanceOf && io.isInstanceOf(IdentifiableObject);
        });
        this._c_pre(function() {return referer;});

        var key = this._lookupKeyOf(io);
        if (key) {
          this._removeReferer(key, referer);
        }
        // else, there is no entry, so nobody is tracking anyway
      },

      stopTrackingCompletely: function(/*IdentifiableObject*/ io) {
        this._c_pre(function() {return io;});
        this._c_pre(function() {
          //noinspection JSUnresolvedVariable,JSUnresolvedFunction
          return io.isInstanceOf && io.isInstanceOf(IdentifiableObject);
        });

        var self = this;
        //noinspection JSUnresolvedFunction
        var key = self._lookupKeyOf(io);
        if (key) {
          var entry = self._data[key];
          //noinspection JSUnresolvedVariable
          entry._referers.forEach(function(r) {
            //noinspection JSUnresolvedFunction
            self._removeReferer(key, r);
          });
        }
        // else, there is no entry, so nobody is tracking anyway
      },

      _buildTypeCrossReference: function(/*Function*/ PoType, /*String[]?*/ subtypes) {
        // summary:
        //   We register PoType in the entries of all parents, and do the same for them.
        //   We remember what we have already cross-referenced, by adding it to hash.

        // If a type has an entry, all its parents already have an entry too, recursively.
        // If a type does not have an entry, its parents might or might not have an entry.
        // Entries known for a type are also known for all the parents of that type, recursively.

        // Add subtypes to the entry for PoType and all its Parents.
        // PoType might have an entry already, or not. In any case, subtypes are not in them yet, unless
        // we are travelling through a diamond inheritance hierarchy, and we visited the supertype
        // already via another branch. In that case, we might have processed the common part of different
        // paths already, but not the difference! This means that some subtypes might already be registered,
        // and not others.

        var self = this;

        //noinspection JSUnresolvedFunction
        if (!PoType.prototype.isInstanceOf(IdentifiableObject)) {
          return;
        }

        var localSubtypes = subtypes || [];

        //noinspection JSUnresolvedFunction
        var poTypeDescription = PoType.prototype.getTypeDescription();
        //noinspection JSUnresolvedVariable
        if (!self._typeCrossReference[poTypeDescription]) {
          // PoType is not handled yet. Create an entry for it, and add subtypes.
          //noinspection JSUnresolvedVariable
          self._typeCrossReference[poTypeDescription] = [poTypeDescription].concat(localSubtypes);
          // There might or might not be entries for all parents of PoType. In any case, PoType is not
          // in them yet, and neither are subtypes.
          //noinspection JSUnresolvedVariable
          PoType._meta.parents.forEach(function(Parent) {
            //noinspection JSUnresolvedFunction,JSUnresolvedVariable
            self._buildTypeCrossReference(Parent, self._typeCrossReference[poTypeDescription]);
          });
        }
        else {
          // There was an entry for PoType already, so it was handled already, and is known
          // to all its Parents, that exist already, too. We only have to add subtypes
          // to the PoType entry and all its parents, that are not known here yet.
          // Those that are known here already, are known to the super types already also.
          var delta = localSubtypes.filter(function(sub) {
            //noinspection JSUnresolvedVariable
            return self._typeCrossReference[poTypeDescription].indexOf(sub) < 0;
          });
          //noinspection JSUnresolvedVariable
          self._typeCrossReference[poTypeDescription].concat(delta);
          //noinspection JSUnresolvedVariable
          PoType._meta.parents.forEach(function(Parent) {
            //noinspection JSUnresolvedFunction
            self._buildTypeCrossReference(Parent, delta);
          });
        }
      },

      forEach: function(callback, thisArg) {
        var self = this;
        var keys = Object.keys(self._data);
        var entries = keys.map(function(key) {
          //noinspection JSUnresolvedVariable
          return self._data[key].payload;
        });
        entries.forEach(callback, thisArg);
      },

      report: function() {
        var self = this;
        var keys = Object.keys(self._data);
        var accumulation = keys.reduce(
          function(acc, key) {
            if (!acc.minCreatedAt || self._data[key].createdAt < acc.minCreatedAt) {
              acc.minCreatedAt = self._data[key].createdAt;
            }
            if (!acc.maxCreatedAt || acc.maxCreatedAt < self._data[key].createdAt) {
              acc.maxCreatedAt = self._data[key].createdAt;
            }
            acc.nrOfReferers += self._data[key].getNrOfReferers();
            return acc;
          },
          {
            minCreatedAt: undefined,
            maxCreatedAt: undefined,
            nrOfReferers: 0
          }
        );
        var result = {
          nrOfEntries: keys.length,
          earliestEntry: accumulation.minCreatedAt,
          lastEntry: accumulation.maxCreatedAt,
          nrOfReferers: accumulation.nrOfReferers
        };
        result.entries = keys.map(function(key) {
          //noinspection JSUnresolvedFunction
          var keyReport = self._data[key].detailedReport();
          keyReport.key = key;
          return keyReport;
        });
        return result;
      }

    });

    return _Cache; // return Function
  }
);
