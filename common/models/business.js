'use strict';

var async = require('async');
var GeoPoint = require('loopback-datasource-juggler/lib/geo').GeoPoint;
var Promise = require('../../common/utils/Promise');

module.exports = function(Business) {
    Business.prototype.toRemoteObject = function () {
        var Hairfie        = Business.app.models.Hairfie,
            BusinessReview = Business.app.models.BusinessReview;

        return Promise.ninvoke(BusinessReview, 'getBusinessRating', this.id)
            .then((function (rating) {
                return {
                    id              : this.id,
                    name            : this.name,
                    gps             : this.gps,
                    phoneNumber     : this.phoneNumber,
                    timetable       : this.timetable,
                    address         : this.address,
                    pictures        : [GeoPoint(this.gps).streetViewPic()],
                    thumbnail       : GeoPoint(this.gps).streetViewPic(),
                    numHairfies     : Promise.ninvoke(Hairfie, 'count', {businessId: this.id}),
                    numReviews      : rating.numReviews,
                    rating          : rating.rating,
                    crossSell       : true,
                    services        : this.services,
                    createdAt       : this.createdAt,
                    updatedAt       : this.updatedAt,
                }
            }).bind(this));
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
          var doc = {};
          doc.name = business.name;
          if (business.gps) {
              doc.gps = {lat: business.gps.lat, lon: business.gps.lng};
          }

          app.models.SearchEngine.index('business', business.id, doc);
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
            limit       = Math.min(limit || 10, 50);

        Promise.denodeify(Business.getApp.bind(Business))()
            .then(function (app) {
                var SearchEngine = app.models.SearchEngine;

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

                return SearchEngine.search('business', body);
            })
            .then(searchResultBusinesses)
            .nodeify(callback)
        ;
    }

    function searchResultBusinesses(result) {
        var ids = result[0].hits.hits.map(function (hit) { return hit._id; });

        return Promise.denodeify(Business.findByIds.bind(Business))(ids);
    }

    Business.similar = function (businessId, limit, callback) {
        var maxDistance = 5000,
            limit       = Math.min(limit || 10, 50);

        Business.findById(businessId, function (error, business) {
            if (error) return callback(error);
            if (!business) return callback('business not found');

            // @todo handle the case the business has no location
            if (!business.gps) return callback('business has no location');

            var here = GeoPoint(business.gps);

            var body = {
                size: limit,
                query: {
                    filtered: {
                        filter: {
                            and: [
                                {
                                    geo_distance: {
                                        distance: maxDistance,
                                        distance_unit: 'm',
                                        gps: here.asElasticPoint()
                                    }
                                },
                                {
                                    not: {
                                        ids: {
                                            values: [businessId]
                                        }
                                    }
                                }
                            ]
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
            };


            Business.app.models.SearchEngine.search('business', body)
                .then(searchResultBusinesses)
                .nodeify(callback)
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
