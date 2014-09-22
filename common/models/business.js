'use strict';

var async = require('async');
var GeoPoint = require('loopback-datasource-juggler/lib/geo').GeoPoint;
var Promise = require('../../common/utils/Promise');

module.exports = function(Business) {
    Business.prototype.toRemoteObject = function () {
        var Hairfie = Business.app.models.Hairfie;

        return {
            id              : this.id,
            name            : this.name,
            gps             : this.gps,
            phoneNumbers    : this.phone_numbers,
            timetable       : this.timetables || {},
            address         : {
                street  : this.street ? this.street.upperFirst() : '',
                zipcode : this.zipcode,
                city    : this.city ? this.city.upperFirst() : ''
            },
            pictures        : [GeoPoint(this.gps).streetViewPic()],
            thumbnail       : GeoPoint(this.gps).streetViewPic(),
            distance        : this.distance,
            numHairfies     : Promise.ninvoke(Hairfie, 'count', {businessId: this.id}),
            crossSell       : true,
            createdAt       : this.createdAt,
            updatedAt       : this.updatedAt

            // mocked properties
            prices          : [],
        }
    };

    Business.prototype.toRemoteShortObject = function () {
        return {
            id      : this.id,
            name    : this.name,
            address         : {
                street  : this.street ? this.street.upperFirst() : '',
                zipcode : this.zipcode,
                city    : this.city ? this.city.upperFirst() : ''
            }
        };
    };

    Business.afterSave = function (next) {
      var business = this;

      Business.getApp(function (_, app) {
          // index business on search engine
          app.models.SearchEngine.index('business', business.id, {
              name: business.name,
              gps:  {lat: business.gps.lat, lon: business.gps.lng}
          });
      });

      next();
    };

    Business.afterDestroy = function (next) {
        Business.getApp(function (_, app) {
            // remove business from search index
            app.models.SearchEngine.delete('business', business.id);
        });

        next();
    };

    Business.nearby = function(here, query, page, limit, callback) {
        var maxDistance = 5000,
            here        = GeoPoint(here),
            page        = page || 0,
            limit       = limit || 10;

        Promise.denodeify(Business.getApp.bind(Business))()
            .then(function (app) {
                var searchEngine = app.models.SearchEngine;

                // @todo build query using elasticjs (http://docs.fullscale.co/elasticjs/)
                var body = {
                    from: page * limit,
                    size: limit,
                    query: {
                        filtered: {
                            filter: {
                                geo_distance: {
                                    distance: maxDistance,
                                    distance_unit: 'm',
                                    gps: here.asElasticPoint()
                                }
                            }
                        }
                    },
                    sort: {
                        _geo_distance: {
                            gps: here.asElasticPoint(),
                            order: 'asc',
                            unit: 'm'
                        }
                    }
                }

                if (query) {
                    body.query.filtered.query = {
                        match: {
                            name: {
                                query: query,
                                fuzziness: "AUTO"
                            }
                        }
                    };
                }

                return app.models.SearchEngine.search('business', body);
            })
            .then(function (result) {
                var ids = [], distances = {};
                result[0].hits.hits.forEach(function (hit) {
                    ids.push(hit._id);
                    distances[hit._id] = Math.round(hit.sort[0]);
                });

                return Promise.denodeify(Business.findByIds.bind(Business))(ids)
                    .then(function (businesses) {
                        // add distance to businesses
                        return businesses.map(function (business) {
                            business.distance = distances[business.id];

                            return business;
                        });
                    })
                ;
            })
            .nodeify(callback)
        ;
    }

    Business.similar = function (businessId, limit, callback) {
        var limit = limit || 10;
        if (limit  > 20) return callback('limit must be <= 20');

        Business.findById(businessId, function (error, business) {
            if (error) return callback(error);
            if (!business) return callback('business not found');

            // @todo handle the case the business has no location
            if (!business.gps) return callback('business has no location');

            Business.find({
                where: {
                    // @todo use a not equal id in query
                    gps: {near: business.gps, maxDistance: 1000},
                },
                limit: limit + 1
            }, function (error, businesses) {
                if (error) return callback(error);

                var businesses = businesses
                    .filter(function (business) { return business.id != businessId; })
                    // TODO: why not already Business instances?
                    .map(function (business) { return new Business(business); });

                callback(null, businesses);
            });
        });
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

    Business.remoteMethod('nearby', {
        description: 'Find nearby locations around you',
        accepts: [
            {arg: 'here', type: 'GeoPoint', required: true, description: 'geo location:lng,lat. For ex : 2.30,48.87'},
            {arg: 'query', type: 'String', description: 'plain text search'},
            {arg: 'page', type: 'Number', description: 'number of pages (page size defined by limit)'},
            {arg: 'limit', type: 'Number', description: 'number of businesss to get, default=10'}
        ],
        returns: {arg: 'businesses', root: true},
        http: { verb: 'GET' }
    });

    Business.remoteMethod('similar', {
        description: 'Find similar businesses',
        accepts: [
            {arg: 'businessId', type: 'ObjectId', description: 'ID of the reference business'},
            {arg: 'limit', type: 'Number', description: 'number of businesss to get, default=10'}
        ],
        returns: {arg: 'businesses', root: true},
        http: { verb: 'GET', path: '/:businessId/similar' }
    });

    Business.beforeRemote('**', function(ctx, business, next) {
        if(ctx.methodString == 'Business.find') {
            if(!ctx["args"]["filter"]) {
                ctx["args"]["filter"] = {limit: 10};
            } else if(!ctx["args"]["filter"]["limit"]) {
                ctx["args"]["filter"]["limit"] = 10;
            }
        }
        next();
    });
};
