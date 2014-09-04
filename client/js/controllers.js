'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
    .controller('HomeCtrl', [function () {}])
    .controller('ResetPasswordCtrl', ['$scope', '$routeParams', 'LoopBackAuth', 'User', function($scope, $routeParams, LoopBackAuth, User) {
        $scope.token = $routeParams.token;
        $scope.uid = $routeParams.uid;
        $scope.displayForm = false;

        LoopBackAuth.currentUserId = $routeParams.uid;
        LoopBackAuth.accessTokenId = $routeParams.token;
        LoopBackAuth.save();

        User.getCurrent(
            function () {
                $scope.displayForm = true;
            },
            function (res) {
                $scope.errorMessage = 'The reset password token has expired, please try again.';
            }
        );

        $scope.changePassword = function() {
            // don't submit when field is empty
            if ($scope.password = '') return;

            $scope.ongoingProgress = true;
            $scope.successMessage = null;
            $scope.errorMessage = null;

            User.upsert({
                id: $routeParams.uid,
                password: $scope.password
            }).$promise
            .then(function() {
                $scope.successMessage = 'Your password has been successfully reset, you can now log in to the app using your new password.';
                $scope.ongoingProgress = false;
                $scope.displayForm = false;
            })
            .catch(function(error) {
console.log(error);
                $scope.errorMessage = 'Your new password is not valid, please try again.';
                $scope.ongoingProgress = false;
            });
        };
  }]);
