/**
 * MarkTime Plugin Manager
 */

var debug = require('debug')('marktime:plugins');
var Promise = require('bluebird');
var marktime = require('./');
var fs = require('fs');
var path = require('path');
var AwesomeEmitter = require('../util/AwesomeEmitter');
var SandboxContext = require('../util/SandboxContext');
var EventEmitterProxy = require('../util/EventEmitterProxy');
var arrayUtil = require('../util/array');
var util = require('util');

var config = {}, plugins = {};

/**
 * Creates a new plugin object
 *
 * @param {Object?} obj The plugin configuration
 * @param {Boolean?} ignoreContext Set to true to not create a context
 * @constructor
 */
function Plugin(obj, ignoreContext) {
    obj = obj || {};

    this.main = obj.main || config.default_main;
    this.name = obj.name || config.default_name;
    this.version = obj.version || config.default_version;
    this.description = obj.description || config.default_description;
    this.authors = obj.authors || config.default_authors;
    this.dependencies = obj.dependencies || config.default_dependencies;

    this.contextCache = {};
    this.apis = {};
    this.apiCache = {};

    this.context = ignoreContext || new SandboxContext();
    var constructorEvents = this.constructorEvents = {};

    this.hasInitialized = false;

    var self = this;

    /**
     * Used to create an API
     *
     * @param {String} name The name of the API
     * @inherits EventEmitterProxy
     * @throws Error if an API with the name already exists
     * @constructor
     */
    function APIConstructor(name) {
        this.name = name;
        if (self.apis[name]) throw new Error('An API with the name "' + name + '" already exists');
        constructorEvents[name] = new AwesomeEmitter();
        EventEmitterProxy.call(this, constructorEvents[name]);

        self.apis[name] = this;

        // If all APIs have already been initialized, initialize this one now
        if (self.hasInitialized) {
            debug('system already initialized');
            Promise.all(constructorEvents[name].emit('initialize')).then(function() {
                debug('finished initializing');
            });
        }
    }
    util.inherits(APIConstructor, EventEmitterProxy);

    this.APIConstructor = APIConstructor;
}

/**
 * Loads the plugin
 *
 * @returns {Promise}
 */
Plugin.prototype.load = function() {
    var self = this;
    this.context.copy({
        Promise: Promise,
        marktime: defaultPlugin.createContext(this),
        plugins: {
            get: function(name) {
                if (!plugins[name]) throw new Error('No plugin called "' + name + '"');
                return plugins[name].createContext(self);
            }
        },
        API: this.APIConstructor
    }, new EventEmitterProxy(marktime.events));

    return this.loadApis();
};

Plugin.prototype.loadApis = function() {
    debug('initializing %s apis on %s', Object.keys(this.apis).length, this.name);
    var apiPromises = [], pluginName = this.name;
    for (var name in this.apis) {
        if (!this.apis.hasOwnProperty(name)) continue;
        debug('initializing api %s', name);
        apiPromises.push.apply(apiPromises, this.constructorEvents[name].emit(window, 'initialize'));
        this.hasInitialized = true;
    }
    return Promise.all(apiPromises).then(function() {
        debug('finished initializing plugins on %s', pluginName);
    });
};

/**
 * Creates a context object for the plugins APIs
 *
 * @param {Plugin} plugin The plugin using the context
 */
Plugin.prototype.createContext = function(plugin) {
    if (this.contextCache[plugin.name]) return this.contextCache[plugin.name];
    var self = this;

    /**
     * Gets a plugin API
     *
     * @param {String} name
     * @param {*...} args
     * @throws Error if the API does not exist
     */
    function getApi(name, args) {
        args = [].slice.call(arguments, 1);

        name = name.toLowerCase();
        if (!self.apis[name]) throw new Error('Unknown API "' + name + '" on plugin "' + self.name + '"');

        if (!self.apiCache[name]) self.apiCache[name] = [];
        var apiCache = self.apiCache[name];
        for (var i = 0; i < apiCache.length; i++) {
            var cacheItem = apiCache[i];
            if (cacheItem.plugin === plugin.name && arrayUtil.equals(cacheItem.args, args)) return cacheItem.obj;
        }

        // No cache hits found, create a new item
        debug('creating api %s for %s', name, plugin.name);
        var apiResult = {};
        apiResult._api = apiResult;
        var params = [].slice.call(arguments, 0);
        params[0] = apiResult;

        var api = self.apis[name];
        params.unshift('use');
        params.unshift(plugin.createContext(self));
        self.constructorEvents[name].emit.apply(api, params);

        apiCache.push({
            plugin: plugin.name,
            args: args,
            obj: apiResult._api
        });
        return apiResult._api;
    }

    getApi.api = getApi;

    /**
     * Finds if an API exists
     *
     * @param {String} name The name of the API
     */
    getApi.exists = function(name) {
        return !!self.apis[name];
    };

    /**
     * Gets the plugin configuration
     *
     * @returns {Dictionary}
     */
    getApi.config = function() {
        return mt('preferences').getDictionary('plugin.config.' + plugin);
    };

    this.contextCache[plugin.name] = getApi;
    return getApi;
};

exports.Plugin = Plugin;

// Create the default MarkTime plugin
var defaultPlugin = exports.defaultPlugin = new Plugin({
    main: null,
    name: 'MarkTime',
    version: '0.1.0',
    description: '',
    authors: ['John Board', 'Nicholas Thorne', 'Tom Barham'],
    dependencies: {}
}, true);
require('./default')(defaultPlugin.APIConstructor);
var mt = exports.default = defaultPlugin.createContext(defaultPlugin);

/**
 * Initializes all plugins
 */
exports.initialize = function() {
    return defaultPlugin.loadApis().then(function() {
        debug('loading default plugin configuration');
        config = mt('configuration').load('plugin.config', {
            folder_root: 'plugins/',
            file_plugin: 'plugin.json',
            default_main: 'index.js',
            default_name: 'My Plugin',
            default_version: '1.0.0',
            default_description: '<em>No Description</em>',
            default_authors: [],
            default_dependencies: {}
        });

        var pluginList = mt('preferences').maybe('plugin.list', []);
        debug('found %s plugins, loading definitions', pluginList.length);

        // Load all plugin files
        return loadPluginDefs(pluginList).then(function (defs) {
            debug('finished loading definitions, initializing plugins');
            // Create plugin objects
            for (var pluginName in defs) {
                if (!defs.hasOwnProperty(pluginName)) continue;
                plugins[pluginName] = new Plugin(defs[pluginName]);
            }

            var loadedPlugins = [];
            return Promise.resolve(Object.keys(plugins)).each(function (name, index, arrayLength) {
                return loadPlugin(plugins[name], [], plugins);
            });
        }).then(function () {
            // Finished loading all plugins!
            debug('finished loading plugins');
        });
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
    debug('loading %s dependencies for %s', dependencyNames.length, plugin.name);

    return Promise.resolve(dependencyNames).each(function(name, index, arrayLength) {
        if (!plugins[name]) throw new Error(plugin.name + ' requires ' + name + ' which is not installed');
        var dependency = plugins[name];
        dependantArgs.push(dependency);
        if (loadedPlugins.indexOf(dependency.name) !== -1) return;

        return loadPlugin(dependency, loadedPlugins, plugins);
    }).then(function() {
        return plugin.load();
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
        debug('loading plugin definition for %s', pluginName);
        promises[pluginName] = new Promise(function(resolve, reject) {
            fs.readFile(path.join(marktime.root, config.folder_root, pluginName, config.file_plugin), 'utf8', function(err, data) {
                if (err) reject(err);
                else resolve(data);
            });
        });
    }
    return Promise.props(promises);
}
