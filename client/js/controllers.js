'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
    .controller('HomeCtrl', [function () {}])
    .controller('ResetPasswordCtrl', ['$scope', '$routeParams', 'LoopBackAuth', 'User', function($scope, $routeParams, LoopBackAuth, User) {
        $scope.token = $routeParams.token;
        $scope.uid = $routeParams.uid;

        LoopBackAuth.currentUserId = $routeParams.uid;
        LoopBackAuth.accessTokenId = $routeParams.token;
        LoopBackAuth.save();

        User.getCurrent(function () {}, function (res) {
            $scope.errorMessage = 'The reset password token has expired, please try again.';
        });

        $scope.changePassword = function() {
            $scope.ongoingProgress = true;
            $scope.successMessage = null;
            $scope.errorMessage = null;

            User.upsert({
                id: $routeParams.uid,
                password: $scope.password
            }).$promise
            .then(function() {
                $scope.successMessage = 'Success !';
                $scope.ongoingProgress = false;
            })
            .catch(function(error) {
console.log(error);
                $scope.errorMessage = 'Error !';
                $scope.ongoingProgress = false;
            });
        };
  }]);
