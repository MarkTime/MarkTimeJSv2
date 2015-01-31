/**
 * MarkTime Configuration API
 */

var marktime = require('../core'),
    debug = require('debug')('marktime:api:configuration');

var prefs;

/**
 * Initializes the API
 */
exports.initialize = function() {
    prefs = marktime.api('preferences');
};

/**
 * Creates the object passed to a plugin
 *
 * @param {Object} api
 */
module.exports = function(api) {
    var plugin = this;

    api.load = function(dictionary, obj) {
        debug('loading config keys in %s', dictionary);

        var pref = prefs.getDictionary(dictionary);
        var ret = {}, count = 0;

        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                ret[key] = pref.default(key, obj[key]);
                count++;
            }
        }
        debug('loaded %s keys', count);
        return ret;
    };
};
