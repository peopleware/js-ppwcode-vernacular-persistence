define(["dojo/_base/declare",
        "ppwcode/contracts/_Mixin",
        "./UrlBuilder", "./PersistentObject", "ppwcode/collections/StoreOfStateful", "./IdNotFoundException",
        "ppwcode/collections/ArraySet",
        "dojo/request", "ppwcode/oddsAndEnds/typeOf"],
  function(declare,
           _ContractMixin,
           UrlBuilder, PersistentObject, StoreOfStateful, IdNotFoundException,
           Set,
           request, typeOf) {

    function poTypeCacheKey(/*String*/ serverType, /*Number*/ persistenceId) {
      // summary:
      //   Returns a key.
      // description:
      //   Returns `type + "@" + persistenceId`
//      this._c_pre(function() {return typeOf(serverType) === "string";});
//      this._c_pre(function() {return persistenceId && typeOf(persistenceId) === "number";});
//        Function: there is no this
      if (! (typeOf(serverType) === "string")) { throw new Error(); }
      if (! (persistenceId && typeOf(persistenceId) === "number")) { throw new Error(); }

      return serverType + "@" + persistenceId; // return String
    }

    function poInstanceCacheKey(/*PersistentObject*/ po) {
      // summary:
      //   Returns a key, intended to be unique, for this entry.
      // description:
      //   Returns `persistentObject.getTypeDescription() + "@" + persistentObject.get("persistenceId")`
//      this._c_pre(function() {return po && po.isInstance && po.isInstanceOf(PersistentObject);});
//        Function: there is no this
      if (! (po && po.isInstanceOf && po.isInstanceOf(PersistentObject))) {
        throw new Error("po && po.isInstanceOf && po.isInstanceOf(PersistentObject)");
      }

      return poTypeCacheKey(po.getTypeDescription(), po.persistenceId); // return String
    }

    function storeCacheKey(/*PersistentObject*/ po, /*String*/ toManyPropertyName) {
      // summary:
      //   Returns a key, intended to be unique, for a store that represents po[toManyPropertyname]
      // description:
      //   Returns `persistentObject.getTypeDescription() + "@" + persistentObject.get("persistenceId") + "#" + toManyPropertyName`
//      this._c_pre(function() {return po && po.isInstance && po.isInstanceOf(PersistentObject);});
//      this._c_pre(function() {return typeOf(toManyPropertyName) === "string";});
//        Function: there is no this
      if (! (po && po.isInstanceOf && po.isInstanceOf(PersistentObject))) {
        throw new Error("po && po.isInstanceOf && po.isInstanceOf(PersistentObject)");
      }
      if (! (typeOf(toManyPropertyName) === "string")) { throw new Error(); }

      return poInstanceCacheKey(po) + "#" + toManyPropertyName; // return String
    }

    var _Entry = declare([_ContractMixin], {
      // summary:
      //   Helper class for ./CrudDao. Defines the cache entries, and methods to deal with it.
      //
      //   In the absence of some form of weak reference in JavaScript (promised for ECMAScript 6 / Harmony,
      //   see <http://wiki.ecmascript.org/doku.php?id=harmony:harmony>), we use reference tracking to be
      //   able to release instances from the cache.
      //   An entry in the cache holds the `PersistentObject`

      // summary:
      //   Reference to the object this is an entry for.
      //   This can never change.
      payload: null,

      // summary:
      //   Private. The set of referers.
      _referers: null,

      _c_invar: [
        function() {return this._c_prop_mandatory("payload");},
        function() {return this.payload.isInstanceOf;},
// Cannot really formulate what we want, because of stupid Observable Store wrapper
//        function() {return this.payload.isInstanceOf &&
//          (this.payload.isInstanceOf(PersistentObject) || this.payload.isInstanceOf(StoreOfStateful));},
        function() {return ! this.payload.isInstanceOf(PersistentObject) || this.payload.get("persistenceId");},
        function() {return this.getNrOfReferers() >= 0;}
      ],

      constructor: function(/*Object*/ o) {
        this._c_pre(function() { return o;});

        this.payload = o;
        this._referers = new Set();
      },

      addReferer: function(referer) {
        // summary:
        //   Adds a referer to the set of referers. If referer is already
        //   in the set, nothing happens.
        // description:
        //   Referer can be anything, but usually it is a reference to
        //   the object holding a reference to `persistObject`, or otherwise
        //   responsible for maintaining this reference (i.e., releasing it
        //   when no longer needed, for garbage collection).
        this._c_pre(function() { return referer != null;});

        this._referers.add(referer);
      },

      removeReferer: function(referer) {
        // summary:
        //   Removes a referer from the set referers. If referer is
        //   not in the set to begin with, nothing happens.

        this._referers.remove(referer);
      },

      getNrOfReferers: function() {
        // summary:
        //   Return the number of referers.

        return this._referers.getSize(); // return Number
      }

    });

    var _Cache = declare([_ContractMixin], {

      _c_invar: [
        {
          condition: function() {
            return true;
          },
          objectSelector: function(c) {
            return c._data;
          },
          invars: [
            function() {return this.isInstanceOf && this.isInstanceOf(_Entry);}
          ]
        }
      ],

      _data: null,

      constructor: function() {
        this._data = {};
      },

      getPoByTypeAndId: function(/*String*/ serverType, /*Number*/ persistenceId) {
        // summary:
        //   gets a cached PersistentObject by serverType and id
        //   returns undefined if there is no such entry
        this._c_pre(function() {return typeOf(serverType) === "string";});
        this._c_pre(function() {return typeOf(persistenceId) === "number";});

        var key = poTypeCacheKey(serverType, persistenceId);
        return this._data[key] && this._data[key].payload; // return PersistentObject
      },

      getPo: function(/*PersistentObject*/ po) {
        // summary:
        //   gets a cached PersistentObject for a given po
        //   returns undefined if there is no such entry
        this._c_pre(function() {return po && po.isInstanceOf && po.isInstanceOf(PersistentObject);});

        var key = poInstanceCacheKey(po);
        return this._data[key] && this._data[key].payload; // return PersistentObject
      },

      getToManyStore: function(/*PersistentObject*/ po, /*String*/ toManyPropertyName) {
        // summary:
        //   gets a cached LazyStore for po[toManyProperty]
        //   returns undefined if there is no such entry
        this._c_pre(function() {return po && po.isInstanceOf && po.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return typeOf(toManyPropertyName) === "string";});

        var key = storeCacheKey(po, toManyPropertyName);
        return this._data[key] && this._data[key].payload; // return LazyStore
      },

      _track:function (/*String*/ key, /*Object*/ object, /*Object*/ referer) {
        this._c_pre(function() {return typeOf(key) === "string";});
        this._c_pre(function() {return object;});
        this._c_pre(function() {return referer;});

        var entry = this._data[key];
        if (!entry) {
          entry = new _Entry(object);
          this._data[key] = entry;
          console.log("Entry added to cache: " + object.toString());
        }
        entry.addReferer(referer);
      },

      trackPo: function(/*PersistentObject*/ po, /*Object*/ referer) {
        // summary:
        //   After this call, po will be in the cache, and be tracked by referer.
        // description:
        //   If it was not in the cache yet, it is added, and referer is added as referer.
        //   If it was already in the cache, referer is added as referer.
        //   Since the referers of a cache are a Set, there will be no duplicate entries.
        //
        //   This does nothing for properties of po. We do not go deep.
        this._c_pre(function() {return po && po.isInstanceOf && po.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return po.get("persistenceId");});
        this._c_pre(function() {return referer;});

        var key = poInstanceCacheKey(po);
        this._track(key, po, referer);
      },

      trackSos: function(/*PersistentObject*/ po, /*String*/ toManyPropertyName, /*StoreOfStateful*/ ls, /*Object*/ referer) {
        // summary:
        //   After this call, ls will be in the cache, and be tracked by referer.
        // description:
        //   If it was not in the cache yet, it is added, and referer is added as referer.
        //   If it was already in the cache, referer is added as referer.
        //   Since the referers of a cache are a Set, there will be no duplicate entries.
        //
        //   This does nothing for elements of ls. We do not go deep.
        this._c_pre(function() {return po && po.isInstanceOf && po.isInstanceOf(PersistentObject);});
        this._c_pre(function() {return po.get("persistenceId");});
        this._c_pre(function() {return typeOf(toManyPropertyName) === "string";});
        this._c_pre(function() {return ls && ls.isInstanceOf;});
// Cannot really formulate what we want, because of stupid Observable Store wrapper
//        this._c_pre(function() {return ls && ls.isInstanceOf && ls.isInstanceOf(StoreOfStateful);});
        this._c_pre(function() {return referer;});

        var key = storeCacheKey(po, toManyPropertyName);
        this._track(key, ls, referer);
      },

      stopTracking: function(/*PersistentObject|StoreOfStateful*/ pols, /*Any*/ referer) {
        // summary:
        //   We note that referer no longer uses pols.
        // description:
        //   If referer was the last referer of pols, pols is removed from the cache.
        //   If pols is removed from the cache, it is also removed as a referer
        //   of all other entries (potentially resulting in removal from the cache
        //   of that entry, recursively).
        this._c_pre(function() {return pols && pols.isInstanceOf;});
// Cannot really formulate what we want, because of stupid Observable Store wrapper
//        this._c_pre(function() {return pols && pols.isInstanceOf &&
//          (pols.isInstanceOf(PersistentObject) || pols.isInstanceOf(StoreOfStateful));});
        this._c_pre(function() {return referer;});


        var key;
        if (pols.isInstanceOf(PersistentObject) && pols.get("persistenceId")) {
          // it can already be deleted from the server, and then peristenceId is null
          key = poInstanceCacheKey(pols);
        }
        else {
          // pols is deleted, and no longer has a peristenceId; or pols is a store;
          // we need to travel all entries
          var propertyNames = Object.keys(this._data);
          for (var i = 0; i < propertyNames.length; i++) {
            if (this._data[propertyNames[i]] === pols) {
              key = propertyNames[i];
              break;
            }
          }
        }
        if (key) {
          this._removeReferer(key, referer);
        }
        // else, there is no entry, so nobody is tracking anyway
      },

      _removeReferer: function(/*String*/ key, /*Object*/ referer) {
        // summary:
        //   Remove referer as referer to the payload of the entry with `key`.
        //   If, by this removal, there are no more referers for that paylaod,
        //   remove the entry from the cache, and remove its payload as referer
        //   from all other entries (recursively).
        this._c_pre(function() {return typeOf(key) === "string";});
        this._c_pre(function() {return referer;});

        var entry = this._data[key];
        if (entry) {
          entry.removeReferer(referer);
          if (entry.getNrOfReferers() <= 0) {
            delete this._data[key];
            console.log("Entry removed from CrudDao cache: " + entry.payload.toString());
            // now, if payload was itself a referer, we need to remove if everywhere as referer
            var propertyNames = Object.keys(this._data);
            for (var i = 0; i < propertyNames.length; i++) {
              this._removeReferer(propertyNames[i], entry.payload);
            }
          }
        }
      }

    });

    return _Cache; // return Function
  }
);
