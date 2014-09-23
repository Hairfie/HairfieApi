'use strict';

/* Directives */


angular.module('myApp.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }])
  .directive('googleplace', function() {
    return {
        require: 'ngModel',
        link: function(scope, element, attrs, model) {
            var options = {
                types: [],
                componentRestrictions: {}
            };
            var autocomplete = new google.maps.places.Autocomplete(element[0], {});
            scope.gPlace = autocomplete;
            google.maps.event.addListener(scope.gPlace, 'place_changed', function() {
                scope.$apply(function() {
                    var place = autocomplete.getPlace();
                    scope.gps = place.geometry.location.lng() + ',' + place.geometry.location.lat();
                    model.$setViewValue(element.val());
                });
            });
        }
    };
});
