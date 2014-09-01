'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
  .controller('MyCtrl1', ['$scope', 'Business', function($scope, Business) {
     $scope.business = Business.count();  // Add LoopBack model
  }])
  .controller('MyCtrl2', ['$scope', function($scope) {

  }]);
