/**
 * MarkTime Preferences API
 */

var marktime = require('../core');
var util = require('util');
var Promise = require('bluebird');
var debug = require('debug')('marktime:api:preferences');
var Dexie = require('dexie');

var db = new Dexie('marktime');
db.version(1).stores({
    prefs: "++id,plugin,props"
});
db.open();

var prefTable = db.prefs;

var pluginEntries = {};

/**
 * Creates the object passed to a plugin
 *
 * @param {Object} api
 * @param {Boolean} readonly
 */
module.exports = function(api, readonly) {
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

    return readonly ? (new ReadonlyDictionary(plugin.name, item.props, parentObj)) : (new Dictionary(plugin.name, item.props, parentObj));
};

/**
 * Initializes the API
 *
 * @returns {Promise}
 */
exports.initialize = function() {
    debug('reading prefs db');
    return Promise.resolve(prefTable.each(function(item) {
        pluginEntries[item.plugin] = item;
    }));
};

function validate(prop, type) {
    if (prop.type !== type) throw new Error('Key "' + prop.name + '" is a ' + prop.type + ', not a ' + type);
    return prop;
}

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
        return !!items[name];
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
            return this.getChild(dictName).set(keyName);
        }

        if (items[name]) validate(items[name], 'property').value = value;
        else {
            items[name] = {
                name: name,
                type: 'property',
                value: value
            };
        }
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
