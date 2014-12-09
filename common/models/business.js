'use strict';

var async = require('async');
var GeoPoint = require('loopback-datasource-juggler/lib/geo').GeoPoint;
var Promise = require('../../common/utils/Promise');
var getSlug = require('speakingurl');
var lodash = require('lodash');

module.exports = function(Business) {
    Business.prototype.toRemoteObject = function () {
        var Hairfie        = Business.app.models.Hairfie,
            Hairdresser    = Business.app.models.Hairdresser,
            BusinessReview = Business.app.models.BusinessReview,
            User           = Business.app.models.User;

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

                var owner = null;
                if(this.managerIds && this.managerIds.length > 0) {
                    owner = Promise
                        .ninvoke(User, 'findById', this.managerIds[0])
                        .then(function(user) {
                            return user ? user.toRemoteShortObject() : null;
                        });
                }

                return {
                    id                 : this.id,
                    name               : this.name,
                    phoneNumber        : this.phoneNumber,
                    address            : this.address,
                    slug               : this.slug(),
                    kind               : this.kind ? this.kind : 'SALON',
                    owner              : owner,
                    description        : this.description,
                    gps                : this.gps,
                    timetable          : this.timetable,
                    thumbnail          : streetViewPicture,
                    pictures           : pictures,
                    numHairfies        : Promise.ninvoke(Hairfie, 'count', {businessId: this.id}),
                    numReviews         : rating.numReviews,
                    rating             : rating.rating,
                    crossSell          : true,
                    services           : this.services,
                    activeHairdressers : activeHairdressers,
                    landingPageUrl     : Business.app.urlGenerator.business(this),
                    createdAt          : this.createdAt,
                    updatedAt          : this.updatedAt,
                }
            }).bind(this));
    };

    Business.prototype.toRemoteShortObject = function () {
        var streetViewPicture = Picture.fromUrl(GeoPoint(this.gps).streetViewPic(Business.app)).toRemoteObject();

        var pictures = this.pictureObjects().map(function (picture) { return picture.toRemoteObject(); });

        if (0 == pictures.length) {
            pictures.push(streetViewPicture);
        }

        return {
            id          : this.id,
            name        : this.name,
            phoneNumber : this.phoneNumber,
            address     : this.address,
            pictures    : pictures
        };
    };

    Business.prototype.slug = function () {
        return getSlug(this.name);
    };

    Business.prototype.pictureObjects = function () {
        if (!Array.isArray(this.pictures)) {
            return [];
        }

        return this.pictures.map(function (picture) {
            return Picture.fromDatabaseValue(picture, 'business-pictures', Business.app);
        });
    };

    Business.prototype.toSearchIndexObject = function () {
          var doc = {};
          doc.name = this.name;
          if (this.gps) {
              doc.gps = {lat: this.gps.lat, lon: this.gps.lng};
          }

          return doc;
    };

    Business.afterSave = function (next) {
        var SearchEngine = Business.app.models.SearchEngine;
        SearchEngine.index('business', this.id, this.toSearchIndexObject());
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
            limit       = Math.min(limit || 10, 100);

        Promise.denodeify(Business.getApp.bind(Business))()
            .then(function (app) {
                var SearchEngine = app.models.SearchEngine;

                // @todo build query using elasticjs (http://docs.fullscale.co/elasticjs/)
                var body = {
                    from: page * limit,
                    size: limit,
                    explain: true,
                }

                if (query) {
                    body.query = {
                        function_score: {
                            functions: [
                                { gauss:  { gps:   { origin: here.asElasticPoint(), scale: "3km" }}},
                            ],
                            query: {
                                match: {
                                    name: {
                                        query: query,
                                        fuzziness: "AUTO"
                                    }
                                }
                            },
                            score_mode: 'multiply'
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
        // var explanations = result[0].hits.hits.map(function (hit) { return JSON.stringify(hit._explanation); });
        // console.log("EXPLANATION :",explanations);

        var ids = result[0].hits.hits.map(function (hit) { return hit._id; });

        return Promise.denodeify(Business.findByIds.bind(Business))(ids);
    }

    Business.similar = function (businessId, limit, callback) {
        var maxDistance = 5000,
            limit       = Math.min(limit || 10, 100);

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
        if (! lodash.contains(ctx.instance.managerIds, ctx.req.accessToken.userId.toString())) {
            return next({statusCode: 403});
        }

        if(ctx.req.body.pictures) {
            var pattern = /^((http|https):\/\/)/;
            ctx.req.body.pictures = lodash.filter(ctx.req.body.pictures, function(url) { return !pattern.test(url)});
        }

        if(ctx.req.body.phoneNumber) {
            ctx.req.body.phoneNumber = ctx.req.body.phoneNumber.replace(/\s/g, '');
        }

        // remove some fields if present
        delete ctx.req.body.managerIds;
        delete ctx.req.body.slug;

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
