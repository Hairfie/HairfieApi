'use strict';

var async = require('async');
var GeoPoint = require('loopback-datasource-juggler/lib/geo').GeoPoint;
var Promise = require('../../common/utils/Promise');
var getSlug = require('speakingurl');

module.exports = function(Business) {
    Business.prototype.toRemoteObject = function () {
        var Hairfie        = Business.app.models.Hairfie,
            Hairdresser    = Business.app.models.Hairdresser,
            BusinessReview = Business.app.models.BusinessReview;

        return Promise.ninvoke(BusinessReview, 'getBusinessRating', this.id)
            .then((function (rating) {
                var streetViewPicture = Picture.fromUrl(GeoPoint(this.gps).streetViewPic(Business.app)).toRemoteObject();

                var pictures = this.pictureObjects().map(function (picture) { return picture.toRemoteObject(); });

                // add street view when business has no picture
                if (0 == pictures.length) {
                    pictures.push(streetViewPicture);
                }

                var activeHairdressers = Promise
                    .npost(Hairdresser, 'find', [{where: {businessId: this.id, active: true}}])
                    .then(function (hairdressers) {
                        return hairdressers.map(function (hairdresser) {
                            return hairdresser.toRemoteShortObject();
                        });
                    });

                return {
                    id                 : this.id,
                    owner              : Promise.ninvoke(this, 'owner').then(function (user) {
                        return user ? user.toRemoteShortObject() : null;
                    }),
                    name               : this.name,
                    description        : this.description,
                    gps                : this.gps,
                    phoneNumber        : this.phoneNumber,
                    timetable          : this.timetable,
                    address            : this.address,
                    thumbnail          : streetViewPicture,
                    pictures           : pictures,
                    numHairfies        : Promise.ninvoke(Hairfie, 'count', {businessId: this.id}),
                    numReviews         : rating.numReviews,
                    rating             : rating.rating,
                    crossSell          : true,
                    services           : this.services,
                    activeHairdressers : activeHairdressers,
                    createdAt          : this.createdAt,
                    updatedAt          : this.updatedAt,
                }
            }).bind(this));
    };

    Business.prototype.toRemoteShortObject = function () {
        return {
            id      : this.id,
            name    : this.name,
            address : this.address
        };
    };

    Business.prototype.slug = function () {
        return getSlug(this.name);
    };

    Business.pictureObjects = function () {
        if (!Array.isArray(this.pictures)) {
            return [];
        }

        return this.pictures.map(function (picture) {
            return Picture.fromDatabaseValue(picture, 'business-pictures', Business.app);
        });
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
                } else {
                    body.sort = {
                        _geo_distance: {
                            gps: here.asElasticPoint(),
                            order: 'asc',
                            unit: 'm'
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

    Business.beforeRemote('*.updateAttributes', function (ctx, _, next) {
        // user must be logged in
        if (!ctx.req.accessToken) {
            return next({statusCode: 401});
        }

        // only the owner can update a business
        if (ctx.req.accessToken.userId.toString() != ctx.instance.ownerId.toString()) {
            return next({statusCode: 403});
        }

        // remove some fields if present
        delete ctx.req.body.ownerId;

        next();
    });

    Business.remoteMethod('nearby', {
        description: 'Find nearby locations around you',
        accepts: [
            {arg: 'here', type: 'string', required: true, description: 'geo location:lng,lat. For ex : 2.30,48.87'},
            {arg: 'query', type: 'string', description: 'plain text search'},
            {arg: 'page', type: 'number', description: 'number of pages (page size defined by limit)'},
            {arg: 'limit', type: 'number', description: 'number of businesss to get, default=10'}
        ],
        returns: {arg: 'businesses', root: true},
        http: { verb: 'GET' }
    });

    Business.remoteMethod('similar', {
        description: 'Find similar businesses',
        accepts: [
            {arg: 'businessId', type: 'string', description: 'ID of the reference business'},
            {arg: 'limit', type: 'number', description: 'number of businesss to get, default=10'}
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
