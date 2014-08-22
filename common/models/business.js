var async = require('async');
var GeoPoint = require('loopback-datasource-juggler/lib/geo').GeoPoint;
var Abstract = require('./abstract.js');

module.exports = function(Business) {

    Abstract.extend(Business);

    Business.definition.settings.hidden = ['diane_data', 'pj_data', 'city', 'zipcode', 'street'];

    Business.definition.settings.virtuals = {
        address: function(obj) {
          return {
            street: obj.street ? obj.street.upperFirst() : '',
            zipcode: obj.zipcode,
            city: obj.city ? obj.city.upperFirst() : ''
          };
        },
        pictures: function(obj) {
          var gps = GeoPoint(obj.gps);
          return [gps.streetViewPic()];
        },
        thumb: function(obj) {
          var gps = GeoPoint(obj.gps);
          return gps.streetViewPic(120, 140);
        }
    };

    Business.nearby = function(here, page, limit, fn) {

        var max = 1000;
        page = page || 0;
        limit = limit || 10;

        var result = {};

        async.series([
                findBusinesses,
                addDistance
                ],
                function(err){
                    fn(null, result);
                });

        function findBusinesses(cb) {
            Business.find({
                where: {gps: {near: here, maxDistance: max}},
                // paging
                skip: limit * page,
                limit: limit
            }, function(err, businesses) {
                result = businesses;
                cb(err);
            });
        }

        function addDistance(cb) {
            result.forEach(function(business) {
                business.distance = GeoPoint.distanceBetween(here, business.gps, {type: 'meters'});
            });
            cb();
        }
    };

    // Google Maps API has a rate limit of 10 requests per second
    // Seems we need to enforce a lower rate to prevent errors
    var lookupGeo = require('function-rate-limit')(5, 1000, function() {
        var geoService = Business.app.dataSources.geo;
        geoService.geocode.apply(geoService, arguments);
    });

    Business.beforeSave = function(next, business) {
        if (business.gps) return next();
        if(!business.street || !business.city || !business.zipcode) return next();

        // geo code the address
        lookupGeo(business.street, business.city, business.zipcode,
                function(err, result) {
                    if (result && result[0]) {
                        business.gps = result[0].lng + ',' + result[0].lat;
                        next();
                    } else {
                        console.log('could not find location');
                        console.log(err);
                        next();
                    }
                });
    };

    Business.setup = function() {
        Business.base.setup.apply(this, arguments);

        this.remoteMethod('nearby', {
            description: 'Find nearby locations around you',
            accepts: [
        {arg: 'here', type: 'GeoPoint', required: true,
            description: 'geo location:lng,lat. For ex : 2.30,48.87'},
            {arg: 'page', type: 'Number',
                description: 'number of pages (page size defined by limit)'},
            {arg: 'limit', type: 'Number',
                description: 'number of businesss to get, default=10'}
        ],
            returns: {arg: 'businesses', root: true},
            http: { verb: 'GET' }
        });
    };

    Business.setup();

};