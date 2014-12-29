'use strict';

var async = require('async');
var GeoPoint = require('loopback-datasource-juggler/lib/geo').GeoPoint;
var Promise = require('../../common/utils/Promise');
var getSlug = require('speakingurl');
var lodash = require('lodash');
var Control = require('../utils/AccessControl');

module.exports = function(Business) {
    Business.prototype.toRemoteObject = function (context) {
        var Hairfie        = Business.app.models.Hairfie,
            Hairdresser    = Business.app.models.Hairdresser,
            BusinessReview = Business.app.models.BusinessReview,
            BusinessMember = Business.app.models.BusinessMember,
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
                    .npost(this, 'getVisibleActiveMembers')
                    .then(function (members) {
                        return Promise.all(members.map(function (member) {
                                return member.toRemoteShortObject(context);
                        }));
                    });

                var owner = Promise.npost(this, 'owner').then(function (user) {
                    return user && user.toRemoteShortObject(context);
                });

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
                    facebookPage       : this.facebookPage && this.getFacebookPageObject().toRemoteShortObject(context),
                    createdAt          : this.createdAt,
                    updatedAt          : this.updatedAt
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
            slug        : this.slug(),
            phoneNumber : this.phoneNumber,
            address     : this.address,
            pictures    : pictures
        };
    };

    Business.prototype.getFacebookPageObject = function () {
        var User = Business.app.models.user;

        var facebookPage = this.facebookPage || {},
            graphData = facebookPage.graphData || {};

        return {
            toRemoteObject: function (context) {
                return {
                    name        : graphData.name,
                    user        : Promise.ninvoke(User, 'findById', facebookPage.userId).then(function (user) {
                        return user && user.toRemoteShortObject(context);
                    }),
                    createdAt   : facebookPage.createdAt
                };
            },
            toRemoteShortObject: function (context) {
                return {
                    name        : graphData.name
                };
            }
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

    Business.prototype.owner = function (cb) {
        if (!this.id) return cb(null, null);

        var BusinessMember = Business.app.models.BusinessMember;

        var where = {};
        where.active = true;
        where.businessId = this.id;
        where.userId = {neq: null};

        BusinessMember.findOne({where: where}, function (error, businessMember) {
            if (error) cb(error);
            else if (!businessMember) cb(null, null);
            else businessMember.user(cb);
        });
    };

    Business.prototype.getVisibleActiveMembers = function (cb) {
        if (!this.id) cb(null, []);

        var BusinessMember = Business.app.models.BusinessMember;

        var where = {};
        where.businessId = this.id;
        where.active = true;
        where.hidden = false;
        console.log(where);

        BusinessMember.find({where: where}, cb);
    };

    Business.prototype.isClaimed = function () {
        var deferred = Promise.defer();
        var BusinessMember = Business.app.models.BusinessMember;
        var where = {};
        where.businessId = this.id;

        BusinessMember.findOne({where: where}, function (error, bm) {
            if (error) deferred.reject(error);
            deferred.resolve(!!bm);
        });

        return deferred.promise;
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

    Business.getFacebookPage = function (businessId, user, cb) {
        if (!user) return cb({statusCode: 401});

        user.isManagerOfBusiness(businessId)
            .then(function (isManager) {
                if (!isManager) return cb({statusCode: 403});

                return Promise.ninvoke(Business, 'findById', businessId);
            })
            .then(function (business) {
                if (!business || !business.facebookPage) return cb({statusCode: 404});

                cb(null, business.getFacebookPageObject());
            })
            .fail(cb);
    };

    Business.saveFacebookPage = function (businessId, data, user, cb) {
        if (!user) return cb({statusCode: 401});

        user.isManagerOfBusiness(businessId)
            .then(function (isManager) {
                if (!isManager) return cb({statusCode: 403});

                return Promise.ninvoke(Business, 'findById', businessId);
            })
            .then(function (business) {
                if (!business) return cb({statusCode: 404});

                var fb = Business.app.fbGraph;

                fb.get(data.id+'?access_token='+data.access_token, function (error, response) {
                    if (error) return cb({statusCode: 500});
                    if (!response.can_post) return cb({statusCode: 400, message: 'Cannot post'});

                    var facebookPage = business.facebookPage || {};
                    facebookPage.graphData = response;
                    facebookPage.userId = user.id;
                    facebookPage.createdAt = facebookPage.createdAt || new Date();
                    facebookPage.updatedAt = new Date();

                    business.facebookPage = facebookPage;

                    business.save({}, function (error) {
                        if (error) return cb({statusCode: 500});
                        cb(null, business.getFacebookPageObject());
                    });
                });
            })
            .fail(cb);
    };
    Business.deleteFacebookPage = function (businessId, user, cb) {
        if (!user) return cb({statusCode: 401});

        user.isManagerOfBusiness(businessId)
            .then(function (isManager) {
                if (!isManager) return cb({statusCode: 403});

                return Promise.ninvoke(Business, 'findById', businessId);
            })
            .then(function (business) {
                if (!business) return cb({statusCode: 404});

                business.facebookPage = null;
                return Promise.ninvoke(business, 'save');
            })
            .then(cb.bind(null, null), cb);
    };

    Business.prototype.getCustomersObject = function () {
        var User = Business.app.models.user,
            Hairfie = Business.app.models.Hairfie;

        var filter = {where: {businessId: this.id, customerEmail: {neq: null}}, order: 'createdAt DESC'};

        var deferred  = Promise.defer();


        Hairfie.find(filter, function(error, hairfies) {
            if (error) return deferred.reject(error);
            if(hairfies.length === 0) return deferred.resolve([]);
            var customers = hairfies.map(function(hairfie) {
                return {
                    email      : hairfie.customerEmail,
                    hairfie    : hairfie.toRemoteObject()
                };
            });
            var result = lodash.reduce(customers, function (prev, current) {
                var customer = lodash.find(prev, function (old) {
                    return old.email === current.email;
                });
                if (customer === undefined) {
                    current.numHairfies = 1;
                    current.hairfies = [current.hairfie];
                    delete current.hairfie;
                    prev.push(current);
                } else {
                    if (!lodash.isArray(customer.hairfies)) {
                        customer.hairfies = [customer.hairfie];
                    }
                    customer.numHairfies++;
                    customer.hairfies.push(current.hairfie);
                }
                return prev;
            }, []);

            deferred.resolve(result);
        });

        return deferred.promise;
    };

    Business.getCustomers = function (businessId, user, cb) {
        if (!user) return cb({statusCode: 401});

        user.isManagerOfBusiness(businessId)
            .then(function (isManager) {
                if (!isManager) return cb({statusCode: 403});

                return Promise.ninvoke(Business, 'findById', businessId);
            })
            .then(function (business) {
                if (!business) return cb({statusCode: 404});
                cb(null, business.getCustomersObject());
            })
            .fail(cb);
    };

    Business.claim = function (businessId, user, cb) {
        var BusinessMember = Business.app.models.BusinessMember;
        console.log("businessId", businessId);
        console.log("user", user);
        if (!user) return cb({statusCode: 401});

        return Promise.ninvoke(Business, 'findById', businessId)
            .then(function(business) {
                if (!business) return cb({statusCode: 404});
                return business.isClaimed()
            })
            .then(function(isClaimed) {
                if (isClaimed) return cb({statusCode: 403});

                return Promise.ninvoke(BusinessMember, 'create', {
                    businessId: businessId,
                    userId: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    hidden: true,
                    active: true
                });
            })
            .then(function(businessMember) {
                cb(null, businessMember);
            })
            .fail(cb);
    };

    Business.beforeRemote('*.updateAttributes', Control.isAuthenticated(function (ctx, _, next) {
        ctx.req.user.isManagerOfBusiness(ctx.instance.id)
            .then(function (isManager) {
                if (!isManager) return next({statusCode: 403});

                if (ctx.req.body.pictures) {
                    var pattern = /^((http|https):\/\/)/;
                    ctx.req.body.pictures = lodash.filter(ctx.req.body.pictures, function(url) { return !pattern.test(url)});
                }

                if (ctx.req.body.phoneNumber) {
                    ctx.req.body.phoneNumber = ctx.req.body.phoneNumber.replace(/\s/g, '');
                }

                // remove some fields if present
                delete ctx.req.body.slug;
                delete ctx.req.body.owner;
                delete ctx.req.body.facebookPage;

                next();
            })
            .fail(next);
    }));

    Business.remoteMethod('nearby', {
        description: 'Find nearby locations around you',
        accepts: [
            {arg: 'here', type: 'string', required: true, description: 'geo location:lng,lat. For ex : 2.30,48.87'},
            {arg: 'query', type: 'string', description: 'plain text search'},
            {arg: 'page', type: 'number', description: 'number of pages (page size defined by limit)'},
            {arg: 'limit', type: 'number', description: 'number of businesses to get, default=10'}
        ],
        returns: {arg: 'businesses', root: true},
        http: { verb: 'GET' }
    });

    Business.remoteMethod('similar', {
        description: 'Find similar businesses',
        accepts: [
            {arg: 'businessId', type: 'string', description: 'ID of the reference business'},
            {arg: 'limit', type: 'number', description: 'number of businesses to get, default=10'}
        ],
        returns: {arg: 'businesses', root: true},
        http: { verb: 'GET', path: '/:businessId/similar' }
    });

    Business.remoteMethod('getFacebookPage', {
        description: 'Returns the facebook page of the business',
        accepts: [
            {arg: 'businessId', type: 'string', description: 'Identifier of the business'},
            {arg: 'user', type: 'object', http: function (ctx) { return ctx.req.user; }}
        ],
        returns: {arg: 'facebookPage', root: true},
        http: {verb: 'GET', path: '/:businessId/facebook-page'}
    });

    Business.remoteMethod('saveFacebookPage', {
        description: 'Saves the facebook page of the business',
        accepts: [
            {arg: 'businessId', type: 'string', description: 'Identifier of the business'},
            {arg: 'data', type: 'object', http: {source: 'body'}},
            {arg: 'user', type: 'object', http: function (ctx) { return ctx.req.user; }}
        ],
        returns: {arg: 'facebookPage', root: true},
        http: {verb: 'PUT', path: '/:businessId/facebook-page'}
    });

    Business.remoteMethod('deleteFacebookPage', {
        description: 'Deletes the facebook page of the business',
        accepts: [
            {arg: 'businessId', type: 'string', description: 'Identifier of the business'},
            {arg: 'user', type: 'object', http: function (ctx) { return ctx.req.user; }}
        ],
        http: {verb: 'DELETE', path: '/:businessId/facebook-page'}
    });

    Business.remoteMethod('getCustomers', {
        description: 'List of customers tagged in this business',
        accepts: [
            {arg: 'businessId', type: 'string', required: true, description: 'Identifier of the business'},
            {arg: 'user', type: 'object', http: function (ctx) { return ctx.req.user; }}
        ],
        returns: {arg: 'customers', root: true},
        http: { path: '/:businessId/customers', verb: 'GET' }
    });

    Business.remoteMethod('claim', {
        description: 'Claim this business',
        accepts: [
            {arg: 'businessId', type: 'string', description: 'ID of the reference business'},
            {arg: 'user', type: 'object', http: function (ctx) { return ctx.req.user; }}
        ],
        returns: {arg: 'business', root: true},
        http: { verb: 'POST', path: '/:businessId/claim' }
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
