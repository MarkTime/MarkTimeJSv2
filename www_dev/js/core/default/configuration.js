/**
 * MarkTime Configuration API
 */

var marktime = require('../');
var debug = require('debug')('marktime:api:configuration');

module.exports = function(API) {

    var configApi = new API('configuration');

    configApi.on('use', function(api) {
        var plugin = this;

        var prefs = marktime.default('preferences');

        api.load = function(dictionary, obj) {
            debug('loading config keys in %s', dictionary);

            var pref = prefs.getChild(dictionary);
            var ret = {}, count = 0;

            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    ret[key] = pref.maybe(key, obj[key]);
                    count++;
                }
            }

            debug('loaded %s keys', count);
            return ret;
        };
    });
};
