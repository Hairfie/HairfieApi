'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
  .controller('ResetPasswordCtrl', ['$scope', '$routeParams', 'LoopBackAuth', 'User', function($scope, $routeParams, LoopBackAuth, User) {
    $scope.token = $routeParams.token;
    $scope.uid = $routeParams.uid;


    LoopBackAuth.currentUserId = $routeParams.uid;
    LoopBackAuth.accessTokenId = $routeParams.token;
    LoopBackAuth.save();

    $scope.changePassword = function() {
      $scope.ongoingProgress = true;
      $scope.successMessage = null;
      $scope.errorMessage = null;

      User.upsert({
        id: $routeParams.uid,
        password: $scope.password
      }).$promise

      .then(function() {
          //alert('okay');
          $scope.successMessage = 'Success !';
          $scope.ongoingProgress = false;
        })

      .catch(function() {
          //alert('not okay');
          $scope.errorMessage = 'Error !';
          $scope.ongoingProgress = false;
        });
    };
  }]);
