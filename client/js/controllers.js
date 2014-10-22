'use strict';

/* Controllers */

angular.module('myApp.controllers', [])
    .controller('HomeCtrl', [function () {
        window.location.href = 'http://soon.hairfie.com';
    }])
    .controller('ResetPasswordCtrl', ['$scope', '$routeParams', 'LoopBackAuth', 'User', function($scope, $routeParams, LoopBackAuth, User) {
        $scope.token = $routeParams.token;
        $scope.uid = $routeParams.uid;
        $scope.displayForm = false;
        $scope.form = {password: ''};

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
            if ('' == $scope.form.password) return;

            $scope.ongoingProgress = true;
            $scope.successMessage = null;
            $scope.errorMessage = null;

            User.upsert({
                id: $routeParams.uid,
                password: $scope.form.password
            }).$promise
            .then(function() {
                $scope.successMessage = 'Your password has been successfully reset, you can now log in to the app using your new password.';
                $scope.ongoingProgress = false;
                $scope.displayForm = false;

                // delete access token
                User.logout();
            })
            .catch(function(error) {
                $scope.errorMessage = 'Your new password is not valid, please try again.';
                $scope.ongoingProgress = false;
            });
        };

    }])
    .controller('BackofficeCtrl', ['$scope', '$routeParams', 'Business', function($scope, $routeParams, Business) {
        $scope.gPlace;

        $scope.$watch('gps', function() {
           if($scope.form) $scope.form.gps = $scope.gps;
        });

        $scope.search = function() {
            if ('' == $scope.form.name) return;
            if ('' == $scope.form.gps) return;
            Business.nearby({
                query: $scope.form.name,
                here: $scope.form.gps
            }).$promise
            .then(function(result) {
                console.log(result);
                $scope.successMessage = 'Success';
                $scope.businesses = result;
            })
            .catch(function(error) {
                $scope.errorMessage = 'Error' + error;
            });
        };
    }]);
