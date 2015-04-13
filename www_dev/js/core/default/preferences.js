/**
 * MarkTime Preferences API
 */

var marktime = require('../');
var util = require('util');
var Promise = require('bluebird');
var debug = require('debug')('marktime:api:preferences');
var Dexie = require('dexie');

var _ = require('underscore');

var db = new Dexie('marktime');
db.version(1).stores({
    prefs: "++id,plugin,props"
});
db.open();

var prefTable = db.prefs;

var pluginEntries = {};

/**
 * Validates a database property with a certain type
 *
 * @param {Object} prop
 * @param {String} type The type to validate against
 * @returns {Object} The original property
 * @throws Error if the property fails validation
 */
function validate(prop, type) {
    if (prop.type !== type) throw new Error('Key "' + prop.name + '" is a ' + prop.type + ', not a ' + type);
    return prop;
}

module.exports = function(API) {

    var prefsApi = new API('preferences');

    prefsApi.on('initialize', function() {
        debug('reading preferences db');
        return Promise.resolve(prefTable.each(function(item) {
            pluginEntries[item.plugin] = item;
            debug('finished loading preferences db');
        }));
    });

    prefsApi.on('use', function(api, readonly) {
        var plugin = this, item;
        if (!pluginEntries[plugin.name]) {
            item = pluginEntries[plugin.name] = { plugin: plugin.name, props: {} };
            prefTable.add(item);
        } else item = pluginEntries[plugin.name];

        var parentObj = {
            save: function() {
                prefTable.update(item.id, {props: item.props});
            }
        };

        api._api = readonly ? (new ReadonlyDictionary(plugin.name, item.props, parentObj)) : (new Dictionary(plugin.name, item.props, parentObj));
    });

};

/**
 * A dictionary object
 * Some functions are created inside of the constructor in order for the items variable to not be exposed.
 *
 * @param {String} name The name of the dictionary
 * @param {Object} items
 * @param {Dictionary|{save: Function}} parent
 * @constructor
 */
function Dictionary(name, items, parent) {
    this.name = name;
    this.readonly = false;

    var dictionaryCache = {};

    /**
     * Clears all items in the dictionary
     */
    this.clear = function() {
        _.each(items, function(elt, index) {
            delete items[index];
        });
        this.save();
    };

    /**
     * Gets the item in the dictionary, or a child if the name has a dot
     *
     * @param {String} name
     * @returns {*}
     * @throws Error if the key is a child dictionary
     */
    this.get = function(name) {
        var dotIndex = name.indexOf('.');
        if (dotIndex !== -1) {
            var dictName = name.substring(0, dotIndex);
            var keyName = name.substring(dotIndex + 1);
            return this.getChild(dictName).get(keyName);
        }

        if (!items[name]) return items[name];
        var value = validate(items[name], 'property');
        return value.value;
    };

    /**
     * Finds if an item exists
     *
     * @param {String} name
     */
    this.exists = function(name) {
        var dotIndex = name.indexOf('.');
        if (dotIndex !== -1) {
            var dictName = name.substring(0, dotIndex);
            var keyName = name.substring(dotIndex + 1);
            return this.getChild(dictName).exists(keyName);
        }

        return !!items[name] && items[name].value != null;
    };

    /**
     * Gets a child dictionary, creating it if it doesn't exist
     *
     * @param {String} name
     * @param {Boolean?} ronly
     * @returns {Dictionary}
     * @throws Error if the key is not a dictionary
     */
    this.getChild = function(name, ronly) {
        var dotIndex = name.indexOf('.');
        if (dotIndex !== -1) {
            var dictName = name.substring(0, dotIndex);
            var keyName = name.substring(dotIndex + 1);
            return this.getChild(dictName, ronly).getChild(keyName, ronly);
        }

        if (!items.hasOwnProperty(name)) {
            items[name] = {
                name: name,
                type: 'dictionary',
                value: {}
            };
        }

        var value = validate(items[name], 'dictionary');
        var isWritable = ronly ? "0" : "1";
        var rName = name + isWritable;

        if (dictionaryCache[rName]) return dictionaryCache[rName];
        else {
            return dictionaryCache[rName] = ronly ? (new ReadonlyDictionary(name, value.value, this)) : (new Dictionary(name, value.value, this));
        }
    };

    /**
     * Sets an item in the dictionary, or a child if the name has a dot
     *
     * @param {String} name
     * @param {*} value
     * @throws Error if the key is a child dictionary
     */
    this.set = function(name, value) {
        var dotIndex = name.indexOf('.');
        if (dotIndex !== -1) {
            var dictName = name.substring(0, dotIndex);
            var keyName = name.substring(dotIndex + 1);
            return this.getChild(dictName).set(keyName, value);
        }

        if (items[name]) validate(items[name], 'property').value = value;
        else {
            items[name] = {
                name: name,
                type: 'property',
                value: value
            };
        }
        this.save();
    };

    /**
     * Sets or gets a dictionary item
     *
     * @param {String} name The name of the item
     * @param {*} val The new value
     * @returns {*} The value
     */
    this.maybe = function(name, val) {
        if (this.exists(name)) return this.get(name);
        this.set(name, val);
        return val;
    };

    /**
     * Saves any modifications to the dictionary
     *
     * This shouldn't need to be used normally, as the .set function saves whenever a modification is made.
     */
    this.save = function() {
        parent.save();
    };
}

/**
 * A read-only dictionary
 *
 * @constructor
 * @inherits Dictionary
 */
function ReadonlyDictionary(dictName) {
    Dictionary.apply(this, arguments);
    this.readonly = true;

    /**
     * Throws an error, because .set is not supported in a readonly dictionary
     *
     * @param {String} name
     * @throws Error
     */
    this.set = function(name) {
        throw new Error('Cannot set key "' + name + '" as dictionary "' + dictName + '" is in readonly mode');
    };

    var getChild = this.getChild;

    /**
     * Don't allow getting a non-readonly child
     *
     * @param {String} name
     */
    this.getChild = function(name) {
        return getChild(name, true);
    }
}

util.inherits(ReadonlyDictionary, Dictionary);
