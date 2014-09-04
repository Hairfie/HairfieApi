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
        .when('/reset_password', {templateUrl: 'partials/password_form.html', controller: 'ResetPasswordCtrl'})
        .otherwise({redirectTo: '/'});
}]);
