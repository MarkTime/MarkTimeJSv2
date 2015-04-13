/**
 * Default MarkTime Plugin
 *
 * Unlike the other plugins, this one is not run in a restricted iframe, and so has access to everything
 *
 * @param {Function} API The API constructor
 */
module.exports = function(API) {

    // Load all default APIs
    require('./configuration')(API);
    require('./preferences')(API);

};
