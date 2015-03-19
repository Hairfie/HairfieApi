'use strict';

var moment = require('moment');
var GeoPoint = require('loopback-datasource-juggler/lib/geo').GeoPoint;
var Promise = require('../../common/utils/Promise');
var lodash = require('lodash');
var Hooks = require('./hooks');


module.exports = function (Station) {
    Hooks.generateId(Station);
    Hooks.updateTimestamps(Station);


    Station.nearby = function (location, cb) {
        var maxDistance = 500, //meters here
            location    = GeoPoint(location);

        return Promise.ninvoke(Station, 'mongoNearby', location, maxDistance)
            .then(function(result) {
                return Promise.ninvoke(Station, 'findByIds', lodash.pluck(result, '_id'));
            });
    };

    Station.mongoNearby = function(location, maxDistance, callback) {
        var collection = Station.dataSource.connector.collection(Station.definition.name);

        var where = {gps: {$near: location, $maxDistance: maxDistance/111120}};

        collection.find(where).toArray(function (error, stations) {
            if (error) return callback(error);

            callback(null, stations);
        });
    }

    Station.remoteMethod('nearby', {
        description: 'Returns the stats for a specific business',
        accepts: [
            {arg: 'location', type: 'string', required: true, description: 'geo location:{lng: ,lat:}.'},
        ],
        returns: {arg: 'stations', root: true},
        http: { verb: 'GET', path: '/' }
    });
};