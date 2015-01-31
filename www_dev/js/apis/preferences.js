/**
 * MarkTime Preferences API
 */

var fs = require('fs');
var marktime = require('../core');
var util = require('util');
var Promise = require('bluebird');
var debug = require('debug')('marktime:api:preferences');

var cache = {}, changes = 0, saveTimeout;
var saveTime, saveChanges;

/**
 * Creates the object passed to a plugin
 *
 * @param {Object} api
 * @param {Boolean} readonly
 */
module.exports = function(api, readonly) {
    var plugin = this;
    var prefs = cache[plugin.name];
    if (!prefs) prefs = cache[plugin.name] = {};

    var dictionaryCache = {};

    /**
     * Gets a dictionary or item in a dictionary if the name has a dot
     *
     * @param {String} name
     * @param {Boolean} ronly Whether the dictionary is readonly, does not override the API setting
     * @returns {Dictionary|ReadonlyDictionary}
     */
    api.get = function(name, ronly) {
        var dotIndex = name.indexOf('.');
        if (dotIndex !== -1) {
            var dictionaryName = name.substring(0, dotIndex);
            var itemName = name.substring(dotIndex + 1, 0);
            return api.get(dictionaryName).get(itemName);
        }

        return api.getDictionary(name, ronly);
    };

    /**
     * Gets just a dictionary item
     *
     * @see get
     */
    api.getDictionary = function(name, ronly) {
        var readonly = readonly || ronly;
        var rName = name + (readonly ? "0" : "1");

        if (dictionaryCache[rName]) return dictionaryCache[rName];
        else {
            if (!prefs[rName]) prefs[rName] = {};
            return dictionaryCache[name] = readonly ? (new ReadonlyDictionary(name, prefs[name])) : (new Dictionary(name, prefs[name]));
        }
    };

    /**
     * Sets a dictionary item, in the format <dictionary>.<item>
     *
     * @param {String} name The name of the item
     * @param {*} val The new value
     * @throws Error if name is invalid
     */
    api.set = function(name, val) {
        var dotIndex = name.indexOf('.');
        if (dotIndex === -1) throw new Error('Invalid dictionary/item name');

        var dictionaryName = name.substring(0, dotIndex);
        var itemName = name.substring(dotIndex + 1);
        return api.get(dictionaryName).set(itemName, val);
    };

    /**
     * Saves preferences
     *
     * @see Dictionary#save
     */
    api.save = save;
};

/**
 * Initializes the API
 *
 * @returns {Promise}
 */
exports.initialize = function() {
    return new Promise(function(resolve, reject) {
        debug('reading prefs file');
        fs.readFile(marktime.root + 'prefs.json', {encoding: 'utf8'}, function (err, data) {
            debug('finished reading prefs file');
            if (err) return reject(err, debug('read error: %s', err));

            cache = JSON.parse(data);

            if (!cache.config) cache.config = {};
            saveTime = cache.config["autosave.time"];
            saveChanges = cache.config["autosave.maxchanges"];
            saveTimeout = setTimeout(save, saveTime);

            resolve();
        });
    });
};

/**
 * Saves the preferences
 *
 * @returns {Promise}
 */
function save() {
    return new Promise(function(resolve, reject) {
        clearTimeout(saveTimeout);
        if (changes > 0) {
            changes = 0;

            debug('saving preferences');
            fs.writeFile(marktime.root + 'prefs.json', JSON.stringify(cache), {encoding: 'utf8'}, function (err) {
                debug('finished writing preferences');
                if (err) {
                    debug('write error: %s', err);
                    reject(err);
                }

                resolve();
            });
        } else resolve();
    }).then(function() {
        saveTimeout = setTimeout(save, saveTime);
    });
}

/**
 * A dictionary object
 * Some functions are created inside of the constructor in order for the items variable to not
 * be exposed.
 *
 * @param {String} name The name of the dictionary
 * @param {Object} items
 * @constructor
 */
function Dictionary(name, items) {
    this.name = name;
    this.readonly = false;

    /**
     * Gets the item in the dictionary
     *
     * @param {String} key
     * @returns {*} The value
     */
    this.get = function(key) {
        return items[key];
    };

    /**
     * Sets an item in the dictionary
     *
     * @param {String} key
     * @param {*} value
     */
    this.set = function(key, value) {
        items[key] = value;

        changes++;
        if (changes > saveChanges) save();
        return value;
    };

    /**
     * Finds if an item exists
     *
     * @param {String} key
     * @returns {Boolean}
     */
    this.exists = function(key) {
        return items.hasOwnProperty(key);
    };
}

/**
 * If the key exists, gets it, otherwise sets it
 *
 * @param {String} key
 * @param {*} value
 * @returns {*}
 */
Dictionary.prototype.maybe = function(key, value) {
    if (this.exists(key)) return this.get(key);
    else return this.set(key, value);
};

/**
 * Saves the preferences
 *
 * Preferences are stored in the root Marktime directory, in the `prefs.json` file.
 *
 * By default, preferences are autosaved after a certain amount of time, or certain amount of modifications. These
 * amounts can be changed by changing the 'preferences.autosave.time' and 'preferences.autosave.maxchanges'
 * configuration values in the 'global' dictionary for MarkTime:
 *
 * 'preferences.autosave.time'          - Integer, the amount of time to wait in-between each autosave. It is reset
 *                                        every time the preferences are saved.
 * 'preferences.autosave.maxchanges'    - Integer, the amount of changes until the preferences will be saved. It is
 *                                        reset every time the preferences are saved. Setting
 *                                        values are the only modifications that increment the current amount of
 *                                        changes.
 *
 * @returns {Promise}
 */
Dictionary.prototype.save = save;

/**
 * A readonly dictionary object
 *
 * @inherits Dictionary
 * @constructor
 */
function ReadonlyDictionary() {
    Dictionary.apply(this, arguments);
    this.readonly = true;

    /**
     * Throws an error, because .set is not supported in a readonly dictionary
     *
     * @throws Error
     */
    this.set = function() {
        throw new Error('Dictionary#set is not supported in read-only mode');
    };
}

util.inherits(ReadonlyDictionary, Dictionary);

/**
 * Throws an error, because .save is not supported in a readonly dictionary
 *
 * @throws Error
 */
ReadonlyDictionary.prototype.save = function() {
    throw new Error('Dictionary#save is not supported in read-only mode');
};
