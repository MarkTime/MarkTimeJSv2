/**
 * MarkTime Plugin Manager
 */

var debug = require('debug')('marktime:plugins');
var Promise = require('bluebird');
var marktime = require('./');
var Context = require('context-eval');
var fs = require('fs');
var path = require('path');

/**
 * Creates a new plugin object
 *
 * @param {Object?} obj The plugin configuration
 * @constructor
 */
function Plugin(obj) {
    obj = obj || {};

    this.main = obj.main || config.main || "index.js";
    this.name = obj.name || config.name || "MarkTime";
    this.version = obj.version || config.version || "0.1.0";
    this.description = obj.description || config.description || "MarkTime is an app to help with the administration of a Boy's Brigade Company.";
    this.authors = obj.authors || (config.authors !== "undefined" ? config.authors : false) || [
        {
            name: "John Board"
        },
        {
            name: "Nicholas Thorne"
        },
        {
            name: "Tom Barham"
        }
    ];
    this.dependencies = obj.dependencies || config.dependencies || {};

    this.hasLoaded = false;
}

Plugin.prototype.load = function(dependencies) {

};

exports.default = new Plugin();

var config = {}, plugins = {};

/**
 * Initializes all plugins
 */
exports.initialize = function() {
    debug('loading default plugin configuration');
    config = marktime.api('configuration').load('plugin.config', {
        folder_root: 'plugins/',
        file_plugin: 'plugin.json',
        default_main: 'index.js',
        default_name: 'My Plugin',
        default_version: '1.0.0',
        default_description: '<em>No Description</em>',
        default_authors: [],
        default_dependencies: {}
    });
    var pluginList = marktime.api('preferences').get('plugin.list');
    debug('found %n plugins, loading definitions', pluginList.length);

    // Load all plugin files
    return loadPluginDefs(pluginList).then(function(defs) {
        debug('finished loading definitions, initializing plugins');
        // Create plugin objects
        for (var pluginName in defs) {
            if (!defs.hasOwnProperty(pluginName)) continue;
            plugins[pluginName] = new Plugin(defs[pluginName]);
        }

        var loadedPlugins = [];
        return Promise.resolve(Object.keys(plugins)).each(function(name, index, arrayLength) {
            return loadPlugin(plugins[name], [], plugins);
        });
    }).then(function() {
        // Finished loading all plugins!
        debug('finished loading plugins');
    });
};

/**
 * Loads a plugin and all of its dependencies
 *
 * @param {Plugin} plugin The plugin object
 * @param {Array} loadedPlugins A list of all loaded plugins
 * @param {Object} plugins A list of all plugins
 * @returns {Promise}
 */
function loadPlugin(plugin, loadedPlugins, plugins) {
    var dependencies = plugin.dependencies,
        dependantArgs = [];

    var dependencyNames = Object.keys(dependencies);
    debug('loading %n dependencies for %s', dependencyNames.length, plugin.name);

    return Promise.resolve(dependencyNames).each(function(name, index, arrayLength) {
        if (!plugins[name]) throw new Error(plugin.name + ' requires ' + name + ' which is not installed');
        var dependency = plugins[name];
        dependantArgs.push(dependency);
        if (loadedPlugins.indexOf(dependency.name) !== -1) return;

        return loadPlugin(dependency, loadedPlugins, plugins);
    }).then(function() {
        return plugin.load(dependantArgs);
    }).then(function() {
        loadedPlugins.push(plugin.name);
    });
}

/**
 * Loads all plugin definition files
 *
 * @param {Array<String>} plugins A list of plugin names
 * @returns {Promise}
 */
function loadPluginDefs(plugins) {
    var promises = {};
    for (var i = 0; i < plugins.length; i++) {
        var pluginName = plugins[i];
        promises[pluginName] = new Promise(function(resolve, reject) {
            fs.readFile(path.join(marktime.root, config.folder_root, pluginName, config.file_plugin), 'utf8', function(err, data) {
                if (err) reject(err);
                else resolve(data);
            });
        });
    }
    return Promise.props(promises);
}

/**
 *
 * @param name
 */
exports.get = function(name) {

};
