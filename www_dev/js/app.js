'use strict';

var constants = require('./constants'),
    controllers = require('./controllers'),
    directives = require('./directives');

function run ($ionicPlatform) {
    $ionicPlatform.ready(function() {
        if(window.StatusBar) {
            // org.apache.cordova.statusbar required
            window.StatusBar.styleDefault();
        }
    });
}

module.exports = angular.module('MyApp', [
    // Ionic
    'ionic',
    // Angular FH API shim
    'FH',

    constants.name,
    controllers.name,
    directives.name
]).run(run);
