'use strict';

var moment = require('moment');
var GeoPoint = require('loopback-datasource-juggler/lib/geo').GeoPoint;
var Promise = require('../../common/utils/Promise');
var q = require('q');
var lodash = require('lodash');
var Hooks = require('./hooks');


module.exports = function (Station) {
    Hooks.generateId(Station);
    Hooks.updateTimestamps(Station);

    Station.prototype.toRemoteObject =
    Station.prototype.toShortRemoteObject = function (context) {

        return {
            gps: this.gps,
            name: this.name,
            lines: this.lines,
            type: this.type,
            source: this.source,
            city: this.city,
            id: this.id
        };
    };

    Station.nearby = function (location, maxDistance, businessId, cb) {
        var Business = Station.app.models.Business;

        var maxDistance = maxDistance || 500;

        if(businessId) {
            var location = Promise
                .ninvoke(Business, 'findById', businessId)
                .then(function(business) {
                    return business.gps;
                });
        }

        return q(location)
        .then(function(location) {
            return Promise.ninvoke(Station, 'mongoNearby', GeoPoint(location), maxDistance)
        })
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
        description: 'Returns the nearby stations',
        accepts: [
            {arg: 'location', type: 'object', description: 'geo location:{lng: ,lat:}.'},
            {arg: 'maxDistance', type: 'number', description: 'distance in meter'},
            {arg: 'businessId', type: 'string', description: 'businessId'}
        ],
        returns: {arg: 'stations', root: true},
        http: { verb: 'GET', path: '/' }
    });
};