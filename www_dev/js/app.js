'use strict';

// For debugging
window.dbg = require('debug');

var constants = require('./constants'),
    controllers = require('./controllers'),
    directives = require('./directives');

var marktime = require('./core');
marktime.initialize();

function run ($ionicPlatform) {
    $ionicPlatform.ready(function() {
        if(window.StatusBar) {
            // org.apache.cordova.statusbar required
            window.StatusBar.styleDefault();
        }
    });
}

var app = module.exports = angular.module('MarkTime', [
    // Ionic
    'ionic',

    constants.name,
    controllers.name,
    directives.name
]);

app.config(function($stateProvider, $urlRouterProvider) {

});

app.controller('HomeTabCtrl', function($scope) {
    console.log("HomeTabCtrl");
});

app.run(run);
