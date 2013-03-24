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
        "ppwcode/contracts/_Mixin",
        "./PersistentObject", "ppwcode/collections/ArraySet",
        "dojo/request", "ppwcode/oddsAndEnds/typeOf"],
  function(declare,
           _ContractMixin,
           PersistentObject, Set,
           request, typeOf) {

    var _Entry = declare([_ContractMixin], {
      // summary:
      //   Helper class for _Cache. Defines the cache entries, and methods to deal with it.
      // description:
      //   In the absence of some form of weak reference in JavaScript (promised for ECMAScript 6 / Harmony,
      //   see <http://wiki.ecmascript.org/doku.php?id=harmony:harmony>), we use reference tracking to be
      //   able to release instances from the cache.

      _c_invar: [
        function() {return this._c_prop_mandatory("payload");},
        function() {return this.payload.isInstanceOf && this.payload.isInstanceOf(PersistentObject);},
        function() {return this.payload.getKey() != null;},
        function() {return this.getNrOfReferers() >= 0;}
      ],

      // payload: PersistentObject
      //   Reference to the PersistentObject this is an entry for.
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

      constructor: function(/*PersistentObject*/ po, /*_Cache*/ cache) {
        this._c_pre(function() {return po;});
        this._c_pre(function() {return po.isInstanceOf && po.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return po.getKey() != null;});
        this._c_pre(function() {return cache;});

        this.payload = po;
        var watcher = po.watch("persistenceId", function(propertyName, oldValue, newValue) {
          if (!newValue) {
            watcher.unwatch();
            watcher = null;
            cache.stopTrackingCompletely(po);
          }
        });
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
        this._c_pre(function() { return referer != null;});

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
        return { payload: this.payload, createdAt: this.createdAt, nrOfReferers: this._referers.getSize() };
      },

      detailedReport: function() {
        return { payload: this.payload, createdAt: this.createdAt, referers: this._referers.toJson() };
      }

    });

    var _Cache = declare([_ContractMixin], {
      // summary:
      //   Cache for PersistentObject instances.
      //   Instances are cached with a referer. Subsequent track-commands add new referers.
      //   When the cache is asked to stop tracking an object, it also removes the object it stops
      //   tracking as a referer everywhere, and removes any LazyToMany instances it has as property value
      //   as referer everywhere.
      //   When there are no more referers for a given instance, it is removed from the cache, recursively.
      // description:
      //   In the absence of some form of weak reference in JavaScript (promised for ECMAScript 6 / Harmony,
      //   see <http://wiki.ecmascript.org/doku.php?id=harmony:harmony>), we use reference tracking to be
      //   able to release instances from the cache.
      //
      //   The cache is *not* responsible for caching deep. Only the offered object is cached
      //   with the given referer.

      _c_invar: [
        {
          condition: function() {
            return true;
          },
          selector: function() {
            return this._data;
          },
          invars: [
            function() {return this.isInstanceOf && this.isInstanceOf(_Entry);}
          ]
        }
      ],

      // _data: Object
      //    Hash for the cache _Entry instances
      //    The keys are getKey() for PersistentObject
      _data: null,

      constructor: function() {
        this._data = {};
      },

      _track: function (/*String*/ key, /*PersistentObject*/ po, /*Object*/ referer) {
        this._c_pre(function() {return typeOf(key) === "string";});
        this._c_pre(function() {return po;});
        this._c_pre(function() {return referer;});

        var entry = this._data[key];
        if (!entry) {
          entry = new _Entry(po, this);
          this._data[key] = entry;
          console.log("Entry added to cache: " + po.toString());
        }
        entry.addReferer(referer);
      },

      _getPayload: function(key) {
        return this._data[key] && this._data[key].payload; // return PersistentObject
      },

      _removeReferer: function(/*String*/ key, /*Object*/ referer) {
        // summary:
        //   Remove referer as referer to the payload of the entry with `key`
        //   (if that exists).
        //   If, by this removal, there are no more referers for that payload,
        //   remove the entry from the cache, and remove its payload as referer
        //   from all other entries (recursively).
        //   If referer is a PersistentObject, all its LazyToMany property values
        //   are also removed as referer from all other entries (recursively).
        this._c_pre(function() {return typeOf(key) === "string";});
        this._c_pre(function() {return referer;});

        var entry = this._data[key];
        if (entry) {
          entry.removeReferer(referer);
          if (entry.getNrOfReferers() <= 0) {
            delete this._data[key];
            console.log("Entry removed from cache: " + entry.payload.toString());
            // now, if payload was itself a referer, we need to remove if everywhere as referer
            var self = this;
            Object.keys(this._data).forEach(function(propertyName) {
              /* Concurrent modification: by the time we get here, the entry might no longer
                 exist (removed by an earlier branch of this backtrack). That is no problem
                 though, because we have if (entry) above. */
              self._removeReferer(propertyName, entry.payload);
              // also do this for all its payload's LazyToManies
              // MUDO
//              Object.keys(entry.payload).forEach(function(poPropName) {
//                var propValue = entry.payload[poPropName];
//                if (propValue && propValue.isInstanceOf && propValue.isInstanceOf(LazyToMany)) {
//                  self._removeReferer(propertyName, propValue);
//                }
//              });
            });
          }
        }
      },

      getByTypeAndId: function(/*String*/ serverType, /*Number*/ persistenceId) {
        // summary:
        //   gets a cached PersistentObject by serverType and id
        //   returns undefined if there is no such entry
        this._c_pre(function() {return typeOf(serverType) === "string";});
        // IDEA subtype of PersistentObject
        this._c_pre(function() {return typeOf(persistenceId) === "number";});

        var key = PersistentObject.keyForId(serverType, persistenceId);
        return this._getPayload(key); // return PersistentObject
      },

      get: function(/*PersistentObject*/ po) {
        // summary:
        //   gets a cached PersistentObject for a given po
        //   returns undefined if there is no such entry
        this._c_pre(function() {return po && po.isInstanceOf && po.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return po.get("persistenceId");});

        var key = po.getKey();
        return this._getPayload(key); // return PersistentObject
      },

      track: function(/*PersistentObject*/ po, /*Object*/ referer) {
        // summary:
        //   After this call, po will be in the cache, and be tracked by referer.
        // description:
        //   If it was not in the cache yet, it is added, and referer is added as referer.
        //   If it was already in the cache, referer is added as referer.
        //   Since the referers of a cache are a Set, there will be no duplicate entries.
        //
        //   This does nothing for properties of po. We do not go deep.
        this._c_pre(function() {return po && po.isInstanceOf && po.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return po.getKey();});
        this._c_pre(function() {return referer;});

        var key = po.getKey();
        this._track(key, po, referer);
      },

      _lookupKeyOf: function (po) {
        var key = po.getKey();
        if (!key) {
          // it can already be deleted from the server, and then persistenceId is null
          // we need to travel all entries
          var propertyNames = Object.keys(this._data);
          for (var i = 0; i < propertyNames.length; i++) {
            if (this._data[propertyNames[i]].payload === po) {
              key = propertyNames[i];
              break;
            }
          }
        }
        return key;
      },

      stopTracking: function(/*PersistentObject*/ po, /*Object*/ referer) {
        // summary:
        //   We note that referer no longer uses po.
        // description:
        //   If referer was the last referer of po, po is removed from the cache.
        //   If po is removed from the cache, it and all its LazyToManyStore property values
        //   are also removed as a referer of all other entries (potentially resulting in
        //   removal from the cache of that entry, recursively).
        //
        //   This also works if po doesn't have a key (anymore).
        this._c_pre(function() {return po && po.isInstanceOf;});
        this._c_pre(function() {return referer;});

        var key = this._lookupKeyOf(po);
        if (key) {
          this._removeReferer(key, referer);
        }
        // else, there is no entry, so nobody is tracking anyway
      },

      stopTrackingCompletely: function(/*PersistentObject*/ po) {
        this._c_pre(function() {return po && po.isInstanceOf && po.isInstanceOf(PersistentObject);});

        var key = this._lookupKeyOf(po);
        if (key) {
          var self = this;
          var entry = this._data[key];
          entry._referers.forEach(function(r) {
            self._removeReferer(key, r);
          });
        }
        // else, there is no entry, so nobody is tracking anyway
      },

      report: function() {
        var self = this;
        var pNames = Object.keys(this._data);
        var minCreatedAt = pNames.reduce(
          function(acc, pn) {
            return acc && acc < self._data[pn].createdAt ? acc : self._data[pn].createdAt;
          },
          null
        );
        var result = { nrOfEntries: pNames.length, earliestEntry:  minCreatedAt };
//        result.entries = pNames.map(function(pn) {
//          return self._data[pn].report();
//        });
        return result;
      }

    });

    return _Cache; // return Function
  }
);
