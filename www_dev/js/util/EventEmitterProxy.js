/**
 * An EventEmitter proxy
 * Wraps an EventEmitter and provides the ability to 'privately' add and remove listeners (i.e one EventEmitterProxy
 * cannot remove events from another, even though events emitted from the main emitter will go to both)
 *
 * Provides all EventEmitter functions except for emit.
 *
 * @param {EventEmitter} evt
 */
function EventEmitterProxy(evt) {
    var events = {};

    this._events = events;

    /**
     * Adds a listener
     *
     * @param {String} event
     * @param {Function} listener
     * @returns {EventEmitterProxy}
     */
    this.addListener = function(event, listener) {
        if (typeof listener !== 'function') throw new TypeError('listener must be a function');

        events[event] = events[event] || [];
        events[event].push(listener);
        evt.addListener(event, listener);
        return this;
    };
    this.on = this.addListener;

    /**
     * Adds a listener, and then removes it when the event is fired
     *
     * @param {String} event
     * @param {Function} listener
     * @returns {EventEmitterProxy}
     */
    this.once = function(event, listener) {
        var self = this, fired = false;

        function g() {
            self.removeListener(event, g);

            if (!fired) {
                fired = true;
                return listener.apply(this, arguments);
            }
        }
        g.listener = listener;
        this.on(event, g);
        return this;
    };

    /**
     * Removes a listener
     *
     * @param {String} event
     * @param {Function} listener
     * @returns {EventEmitterProxy}
     */
    this.removeListener = function(event, listener) {
        if (typeof listener !== 'function') throw new TypeError('listener must be a function');

        if (!events[event]) return;
        var eventsIndex = -1, eventList = events[event];

        for (var i = 0; i < eventList.length; i++) {
            if (eventList[i] === listener || (eventList[i].listener && eventList[i].listener === listener)) {
                eventsIndex = i;
                break;
            }
        }

        if (eventsIndex === -1) return this;
        eventList.splice(eventsIndex, 1);
        evt.removeListener(event, listener);
        return this;
    };

    /**
     * Removes all listeners of a type
     *
     * @param {String} event
     * @returns {EventEmitterProxy}
     */
    this.removeAllListeners = function(event) {
        events[event] = [];
        evt.removeAllListeners(event);
        return this;
    };

    /**
     * Gets a list of all listeners
     *
     * @param {String} event
     * @returns {Array}
     */
    this.listeners = function(event) {
        if (!events[event]) return [];
        else return events[event].slice();
    };
}

module.exports = EventEmitterProxy;
