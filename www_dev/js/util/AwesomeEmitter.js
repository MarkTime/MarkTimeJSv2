var EventEmitter = require('events').EventEmitter;
var util = require('util');

/**
 * Creates the emitter
 *
 * @returns {AwesomeEmitter}
 * @inherits EventEmitter
 * @constructor
 */
function AwesomeEmitter() {
    if (!(this instanceof AwesomeEmitter)) return new AwesomeEmitter();
    EventEmitter.call(this);
}
util.inherits(AwesomeEmitter, EventEmitter);

/**
 * Emits the event type to all handlers using the specified context, and returns an array of the returned values
 *
 * @param {Object} ctx
 * @param {String} type
 * @returns {Array}
 */
AwesomeEmitter.prototype.emit = function(ctx, type) {
    var len, args, i, listeners, res;
    if (!this._events) this._events = {};

    var handler = this._events[type];
    if (typeof handler === 'undefined') return [];
    if (typeof handler === 'function') {
        switch (arguments.length) {
            case 2: return [handler.call(ctx)]; break;
            case 3: return [handler.call(ctx, arguments[2])]; break;
            case 4: return [handler.call(ctx, arguments[3])]; break;
            default:
                len = arguments.length;
                args = new Array(len - 2);
                for (i = 2; i < len; i++) args[i - 2] = arguments[i];
                return [handler.apply(ctx, args)];
        }
    }
    if (Array.isArray(handler)) {
        len = arguments.length;
        args = new Array(len - 2);
        for (i = 2; i < len; i++) args[i - 2] = arguments[i];
        listeners = handler.slice();
        len = listeners.length;
        res = [];
        for (i = 0; i < len; i++) res.push(listeners[i].apply(ctx, args));
        return res;
    }
    return [];
};

/**
 * Binds to the event for one emit, and then unbinds
 *
 * @param {String} type
 * @param {Function} listener
 */
AwesomeEmitter.prototype.once = function(type, listener) {
    if (typeof listener !== 'function') throw new Error('listener must be a function');

    var self = this;
    function g() {
        self.removeListener(type, g);
        return listener.apply(this, arguments);
    }

    g.listener = listener;
    this.on(type, g);
    return this;
};


module.exports = AwesomeEmitter;
