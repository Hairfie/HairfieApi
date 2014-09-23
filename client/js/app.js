'use strict';

// Declare app level module which depends on filters, and services
angular.module('myApp', [
        'ngRoute',
        'myApp.filters',
        'myApp.services',
        'lbServices',
        'myApp.directives',
        'myApp.controllers'
        ]).
config(['$routeProvider', function($routeProvider) {
    $routeProvider
        .when('/', {templateUrl: 'partials/home.html', controller: 'HomeCtrl'})
        .when('/reset-password', {templateUrl: 'partials/reset-password.html', controller: 'ResetPasswordCtrl'})
        .when('/backoffice', {templateUrl: 'partials/backoffice.html', controller: 'BackofficeCtrl'})
        .otherwise({redirectTo: '/'});
}]);
