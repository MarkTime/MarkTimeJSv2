/**
 * MarkTime API manager
 */

var apis = require('../apis/index'),
    debug = require('debug')('marktime:api'),
    Promise = require('bluebird'),
    marktime = require('./');

var apiNames = Object.keys(apis).map(function(val) {
    return val.toLowerCase();
});

var apiCache = {}, contextCache = {};

/**
 * Gets an API
 *
 * @param {String} name The name of the API
 * @param {Array} params The arguments to pass to the API
 * @param {Plugin} plugin The plugin accessing the API
 */
function getApi(name, params, plugin) {
    name = name.toLowerCase();
    if (!exports.exists(name)) throw new Error('No API called ' + name);

    if (!apiCache[name]) apiCache[name] = [];
    var apiCached = apiCache[name];
    for (var i = 0; i < apiCached.length; i++) {
        var cacheItem = apiCached[i];
        if (cacheItem.plugin === plugin.name && cacheItem.args === params) return cacheItem.obj;
    }

    // No cache hits found, create a new item
    var apiResult = {};
    apiResult._api = apiResult;
    params.unshift(apiResult);

    apis[name].apply(plugin, params);
    debug('creating api %s for %s', name, plugin.name);
    apiCache[name].push({
        plugin: plugin.name,
        args: params,
        obj: apiResult
    });
    return apiResult;
}

/**
 * Gets an API
 *
 * @see get
 */
module.exports = function(name, args) {
    args = [].slice.call(arguments, 1);

    return getApi(name, args, exports.default);
};

/**
 * Initializes all APIs
 *
 * @returns {Promise}
 */
exports.initialize = function() {
    Promise.resolve(apiNames).each(function(name, index, value) {
        var creatorFunc = apis[name];
        if (creatorFunc.initialize) return creatorFunc.initialize();
    });
};

/**
 * Checks whether an API exists
 *
 * @param {String} name
 * @returns {Boolean}
 */
exports.exists = function(name) {
    return apiNames.indexOf(name.toLowerCase()) !== -1;
};

/**
 * Gets an API
 *
 * @param {String} name The name of the API
 * @param {*...} args The arguments to pass to the API
 */
exports.get = module.exports;

/**
 * Creates a plugin context for a plugin
 *
 * @param {Plugin} plugin The plugin to create
 * @returns {Object}
 */
exports.createContext = function(plugin) {
    if (contextCache[plugin.name]) return contextCache[plugin.name];

    // No cache hits found, create the context
    var context = {};
    context.api = function(name, args) {
        args = [].slice.call(arguments, 1);
        return getApi(name, args, plugin);
    };
    context.apiExists = function() { return exports.exists.apply(this, arguments); };
    context.config = function() { return marktime.config(); };
    contextCache[plugin.name] = context;
    return context;
};
