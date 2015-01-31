/**
 * MarkTime 'Backend' Javascript
 */

var debug = require('debug')('marktime:core'),
    api = require('./api'),
    plugins = require('./plugins'),
    Promise = require('bluebird'),
    fs = require('fs');

exports.api = api;
exports.plugins = plugins;

/**
 * Initializes the backend
 *
 * @returns {Promise}
 */
exports.initialize = function() {
    debug('beginning initialize');
    return Promise.all([
        Promise.promisify(fs.init)(false),
        api.initialize(),
        plugins.initialize()
    ]).then(function() {
        debug('initialization complete');
    }, function(err) {
        debug('initialization failed: %s', err);
    });
};

/**
 * Gets the main configuration
 */
exports.config = function() {
    return api("preferences").get("config", true);
};

exports.initialized = false;

exports.root = 'marktime/';
