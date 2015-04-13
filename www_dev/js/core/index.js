/**
 * MarkTime 'backend' Javascript
 */

var EventEmitter = require('events').EventEmitter;
var plugins = require('./plugins');
var Promise = require('bluebird');
var fs = require('fs');
var debug = require('debug')('marktime');

exports.events = new EventEmitter();
exports.default = plugins.default;

exports.root = 'marktime/';

window.mt = exports.default;

/**
 * Initializes the backend
 *
 * @returns {Promise}
 */
exports.initialize = function() {
    debug('beginning initialize');
    console.time('initialize');
    plugins.initialize()
    .then(function() {
        debug('initialization complete');
        console.timeEnd('initialize');
        }, function(err) {
        debug('initialization failed: %s', err.stack ? err.stack : err);
    });
};
