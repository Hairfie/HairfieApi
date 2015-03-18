'use strict';

var async = require('async');
var GeoPoint = require('loopback-datasource-juggler/lib/geo').GeoPoint;
var Promise = require('../../common/utils/Promise');
var getSlug = require('speakingurl');
var lodash = require('lodash');
var Control = require('../utils/AccessControl');
var ejs = require('elastic.js');
var UUID = require('uuid');

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
                    href               : Business.app.urlGenerator.api('businesses/'+this.id),
                    name               : this.name,
                    phoneNumber        : this.phoneNumber,
                    address            : this.address,
                    slug               : this.slug(),
                    kind               : this.kind ? this.kind : 'SALON',
                    men                : false != this.men,
                    women              : false != this.women,
                    children           : false != this.children,
                    owner              : owner,
                    description        : this.description,
                    gps                : this.gps,
                    timetable          : this.timetable,
                    thumbnail          : pictures[0],
                    pictures           : pictures,
                    numHairfies        : Promise.ninvoke(Hairfie, 'count', {businessId: this.id}),
                    numReviews         : rating.numReviews,
                    rating             : rating.rating,
                    crossSell          : true,
                    isBookable         : this.isBookable(),
                    services           : this.getServices(),
                    activeHairdressers : activeHairdressers,
                    landingPageUrl     : Business.app.urlGenerator.business(this, context),
                    facebookPage       : this.facebookPage && this.getFacebookPageObject().toRemoteShortObject(context),
                    averagePrice       : this.averagePrice,
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
            href        : Business.app.urlGenerator.api('businesses/'+this.id),
            name        : this.name,
            slug        : this.slug(),
            phoneNumber : this.phoneNumber,
            address     : this.address,
            averagePrice: this.averagePrice,
            pictures    : pictures
        };
    };

    Business.prototype.getFacebookPageObject = function () {
        var User = Business.app.models.user;

        var facebookPage = this.facebookPage || {};

        return {
            toRemoteObject: function (context) {
                return {
                    name        : facebookPage.name,
                    user        : Promise.ninvoke(User, 'findById', facebookPage.userId).then(function (user) {
                        return user && user.toRemoteShortObject(context);
                    }),
                    createdAt   : facebookPage.createdAt
                };
            },
            toRemoteShortObject: function (context) {
                return {
                    name        : facebookPage.name
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

    Business.prototype.isBookable = function() {
        // bypass to allow discount less booking
        if (this.bookable) {
            return true;
        }

        var isBookable = false;
        lodash.each(this.timetable, function(day) {
            if(day.length > 0) {
                lodash.each(day, function(timewindow) {
                    if(timewindow.discount) { isBookable = true };
                });
            }
        });
        return isBookable;
    };

    Business.prototype.hasDiscount = function() {
        return this.bestDiscount > 0;
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

        BusinessMember.find({where: where}, cb);
    };

    Business.prototype.getServices = function(cb) {
        if (!this.id) cb(null, []);
        var BusinessService = Business.app.models.BusinessService;
        var where = {};
        where.businessId = this.id;

        var deferred = Promise.defer();

        BusinessService.find({where: where}, function(error, services) {
            if(error) deferred.reject(error);
            deferred.resolve(services);
        });

        return deferred.promise;
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
        doc.men = false != this.men;
        doc.women = false != this.women;
        doc.children = false != this.children;

        return doc;
    };

    Business.prototype.toAlgoliaSearchIndexObject = function () {
        var BusinessReview = Business.app.models.BusinessReview,
            Hairfie        = Business.app.models.Hairfie;

        return Promise.all([
                Promise.ninvoke(BusinessReview, 'getBusinessRating', this.id),
                Promise.ninvoke(Hairfie, 'count', {businessId: this.id}),
                this.getHairfieTagCounts(),
                this.getAllTags(),
                this.getAllCategories()
            ])
            .spread((function (rating, numHairfies, hairfieTagCounts, _tags, categories) {
                var pictures = this.pictureObjects().map(function (picture) { return picture.toRemoteObject(); });
                if (0 == pictures.length) {
                    pictures.push(Picture.fromUrl(GeoPoint(this.gps).streetViewPic(Business.app)).toRemoteObject());
                }

                var places = this.getAllPlaces()
                    .then(function (results) {
                        return lodash.map(results, 'name');
                    });

                return {
                    id                 : this.id,
                    objectID           : this.id.toString(),
                    name               : this.name,
                    phoneNumber        : this.phoneNumber,
                    address            : this.address,
                    slug               : this.slug(),
                    kind               : this.kind ? this.kind : 'SALON',
                    genders            : this.getGenderArray(),
                    description        : this.description,
                    gps                : this.gps,
                    _geoloc            : {lat: this.gps.lat, lng: this.gps.lng},
                    timetable          : this.timetable,
                    thumbnail          : pictures[0],
                    pictures           : pictures,
                    numHairfies        : numHairfies,
                    numReviews         : rating.numReviews,
                    rating             : rating.rating,
                    crossSell          : true,
                    isBookable         : this.isBookable(),
                    bestDiscount       : this.bestDiscount,
                    landingPageUrl     : Business.app.urlGenerator.business(this),
                    createdAt          : this.createdAt,
                    hairfieTagCounts   : hairfieTagCounts,
                    _tags              : _tags,
                    categories         : lodash.map(categories, 'name'),
                    averagePrice       : this.averagePrice,
                    updatedAt          : this.updatedAt
                }
            }).bind(this));
    };

    Business.prototype.getAllTags = function () {
        var Hairfie  = Business.app.models.Hairfie,
            Tag      = Business.app.models.Tag,
            ObjectID = Hairfie.dataSource.ObjectID,
            hairfies = Hairfie.dataSource.connector.collection(Hairfie.definition.name);

        var pipe = [
            {$match: {businessId: this.id}},
            {$unwind: "$tags"},
            {$group: {_id: "$tags"}}
        ];

        return Promise.ninvoke(hairfies, 'aggregate', pipe)
            .then(function (results) {
                return Promise.ninvoke(Tag, 'findByIds', lodash.map(results, '_id'));
            })
            .then(function(tags) {
                return lodash.map(tags, function(tag) { return tag.name.fr });
            });
    };

    Business.prototype.getAllCategories = function () {
        var Hairfie  = Business.app.models.Hairfie,
            Tag      = Business.app.models.Tag,
            Category = Business.app.models.Category,
            hairfies = Hairfie.dataSource.connector.collection(Hairfie.definition.name);

        var pipe = [
            {$match: {businessId: this.id}},
            {$unwind: "$tags"},
            {$group: {_id: "$tags"}}
        ];

        return Promise.ninvoke(hairfies, 'aggregate', pipe)
            .then(function (results) {
                return Promise.all(
                    lodash.map(results, function(tag) {
                        return Promise.ninvoke(Category, 'find', {where: {tags: tag._id}});
                    })
                )
            })
            .then(function(categories) {
                return lodash.uniq(lodash.flatten(categories), 'id');
            });
    };

    Business.prototype.getAllPlaces = function () {
        // Get PLaces associated with this business
        var Place  = Business.app.models.Place;

        return Promise.ninvoke(Place, 'find', {where: {zipCodes: this.address.zipCode}});
    };

    Business.prototype.getGenderArray = function () {
        var gender = [];
        if (false != this.men)      gender.push("men");
        if (false != this.women)    gender.push("women");
        if (false != this.children) gender.push("children");

        return gender;
    };

    Business.prototype.getHairfieTagCounts = function () {
        var Hairfie  = Business.app.models.Hairfie,
            hairfies = Hairfie.dataSource.connector.collection(Hairfie.definition.name);

        var pipe = [
            {$match: {businessId: this.id}},
            {$unwind: "$tags"},
            {$group: {_id: "$tags", count: {$sum: 1}}},
        ];

        return Promise.ninvoke(hairfies, 'aggregate', pipe)
            .then(function (results) {
                var tagCounts = {};
                results.forEach(function (result) {
                    tagCounts[result._id] = result.count;
                });
                return tagCounts;
            });
    };

    Business.afterCreate = function (next) {
        var business = this;

        Business.app.models.email.notifySales('Business created', {
            'ID'       : business.id,
            'Url'      : Business.app.urlGenerator.business(business),
            'Name'     : business.name,
            'Phone'    : business.phoneNumber,
            'Street'   : business.address && business.address.street,
            'City'     : business.address && business.address.city,
            'Zip code' : business.address && business.address.zipCode,
            'Country'  : business.address && business.address.country
        });

        // don't wait for the email
        next();
    };

    Business.beforeCreate = function (next) {
        this.id = this.id || UUID.v4();
        next();
    };

    function bestDiscountOfTimetable(timetable) {
        var _ = lodash; // shorten a bit the lines above

        var timeWindows = _.flatten(_.values(timetable)),
            discounts   = _.reject(_.map(_.pluck(timeWindows, 'discount'), Number), _.isNaN);

        return _.reduce(discounts, Math.max, 0);
    }

    Business.observe('before save', function updateBestDiscount(ctx, next) {
        if (ctx.instance) {
            ctx.instance.bestDiscount = bestDiscountOfTimetable(ctx.instance.timetable);
        } else {
            // update only when timetable is updated
            if (!lodash.isUndefined(ctx.data.timetable)) {
                ctx.data.bestDiscount = bestDiscountOfTimetable(ctx.data.timetable);
            }
        }

        next();
    });

    Business.observe('after save', function(ctx, next) {
        var AlgoliaSearchEngine = Business.app.models.AlgoliaSearchEngine;
        var business = ctx.instance;

        business.toAlgoliaSearchIndexObject(ctx)
            .then(function(data) {
                console.log("Data to index", data);
                AlgoliaSearchEngine.saveObject('business', data);
            })
            .fail(console.log);

        next();
    });

    Business.afterDestroy = function (next, business) {
        var SearchEngine = Business.app.models.SearchEngine;
        SearchEngine.delete('business', business.id);

        var AlgoliaSearchEngine = Business.app.models.AlgoliaSearchEngine;
        AlgoliaSearchEngine.delete('business', business.id);

        next();
    };

    Business.nearby = function(here, query, clientTypes, page, limit, callback) {
        var collection = Business.dataSource.connector.collection(Business.definition.name);

        // TODO: remove me as soon as the 1.6.3 version of the app is released
        if (lodash.isString(here)) {
            var tmpGeoPoint = GeoPoint(here);
            here = tmpGeoPoint.lng+','+tmpGeoPoint.lat;
        }

        var maxDistance = 8000,
            here        = GeoPoint(here),
            page        = Math.max(page || 1),
            limit       = Math.min(limit || 10, 100),
            skip        = limit * (page - 1),
            query       = query || '';

        if(query) {
            return Promise.ninvoke(Business, 'algoliaSearch', here, maxDistance, query, clientTypes, null, null, page, limit)
                .then(processAlgoliaForNearby)
                .nodeify(callback);
        } else {
            return Promise.ninvoke(Business, 'mongoNearby', here, clientTypes, skip, limit)
                .then(function(result) {
                    // Fix me by instantiating business from JSON
                    return Promise.ninvoke(Business, 'findByIds', lodash.pluck(result, '_id'));
                });
        }
    }

    Business.search = function(location, radius, query, genders, facetFilters, price, page, limit, callback) {
        var maxDistance = radius || 10000,
            location    = location ? GeoPoint(location) : null,
            page        = Math.max(page || 1),
            limit       = Math.min(limit || 10, 100),
            query       = query || '';

        return Promise.ninvoke(Business, 'algoliaSearch', location, maxDistance, query, genders, facetFilters, price, page, limit)
            .then(processAlgoliaForSearch)
            .nodeify(callback)
        ;
    }

    Business.mongoNearby = function(here, clientTypes, skip, limit, callback) {
        var collection = Business.dataSource.connector.collection(Business.definition.name);

        var where = {gps: {$near: here}};
        var options = {limit: limit, skip: skip};

        collection.find(where, options).toArray(function (error, businesses) {
            if (error) return callback(error);

            callback(null, businesses);
        });
    }

    Business.algoliaSearch = function(location, maxDistance, query, genders, facetFilters, price, page, limit, callback)  {
        var AlgoliaSearchEngine = Business.app.models.AlgoliaSearchEngine;

        var params = {
            hitsPerPage: limit,
            page: page - 1,
            facets: '*'
        };

        var numericFiltersArr = [];
        var facetFiltersArr = [];

        if(location) {
            params.aroundLatLng = location.asLatLngString(),
            params.aroundRadius = maxDistance,
            params.aroundPrecision = 10
        }

        if(genders) {
            params.facetFilters += ',(' + lodash.map(genders, function(gender) {
                return "genders:"+gender;
            }).join(',') + ')';
        }

        if(facetFilters) {
            lodash.forEach(facetFilters, function(filters, facetFilter) {
                filters = lodash.isArray(filters) ? filters : [filters];
                facetFiltersArr.push('(' + lodash.map(lodash.toArray(filters), function(filter) {
                    return facetFilter + ':' + filter;
                }).join(',') + ')' );
            });
        }

        if(price && price.min) {
            numericFiltersArr.push('(averagePrice.men>' + price.min + ',averagePrice.women>' + price.min + ')');
        }

        if(price && price.max) {
            numericFiltersArr.push('(averagePrice.men<' + price.max + ',averagePrice.women<' + price.max + ')');
        }

        if(numericFiltersArr.length > 0) {
            params.numericFilters = numericFiltersArr.join(',');
        }

        if(facetFiltersArr.length > 0) {
            params.facetFilters = facetFiltersArr.join(',');
        }

        console.log("Algolia sent Params :", params);

        return AlgoliaSearchEngine.search('business', query, params)
            .nodeify(callback);
    }

    function processAlgoliaForSearch(result) {
        var ids = result.hits.map(function (hit) { return hit.id; });

        return Promise.denodeify(Business.findByIds.bind(Business))(ids)
            .then(function(businesses) {
                return {
                    toRemoteObject: function (context) {
                        return {
                            hits: lodash.map(businesses, function(business) {
                                return business.toRemoteShortObject()
                            }),
                            facets: result.facets,
                            nbHits : result.nbHits,
                            page : result.page,
                            nbPages : result.nbPages,
                            hitsPerPage : result.hitsPerPage
                        }
                    }
                }
            });
    }

    function processAlgoliaForNearby(result) {
        var ids = result.hits.map(function (hit) { return hit.id; });

        return Promise.denodeify(Business.findByIds.bind(Business))(ids)
            .then(function(businesses) {
                return {
                    toRemoteObject: function (context) {
                        return lodash.map(businesses, function(business) {
                            return business.toRemoteShortObject()
                        })
                    }
                }
            });
    }

    Business.similar = function (businessId, limit, callback) {
        var AlgoliaSearchEngine = Business.app.models.AlgoliaSearchEngine;
        var maxDistance = 5000,
            limit       = Math.min(limit || 10, 100);

        return Promise.denodeify(Business.findById.bind(Business))(businessId)
            .then(function(business) {
                // @todo handle the case the business has no location
                if (!business.gps) return callback('business has no location');

                var here = GeoPoint(business.gps);

                var params = {
                    hitsPerPage: limit,
                    aroundLatLng: here.asLatLngString(),
                    aroundRadius: maxDistance
                };

                return AlgoliaSearchEngine.search('business', '', params);
            })
            .then(function(result) {
                result.hits = lodash.filter(result.hits, function(business) { return business.id != businessId });
                return result;
            })
            .then(processAlgoliaForNearby)
            .nodeify(callback);
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
                    facebookPage.userId = user.id;
                    facebookPage.facebookId = data.id;
                    facebookPage.name = response.name;
                    facebookPage.accessToken = data.access_token;
                    facebookPage.graphData = response;
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
        var app = Business.app;
        var BusinessMember = app.models.BusinessMember;
        var User = app.models.User;
        var adminIds = app.get('adminIds');
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
                    gender: user.gender,
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
            .then(function() {
                return Promise.ninvoke(User, 'findByIds', adminIds)
            })
            .then(function(admins) {
                return Promise.all(admins.map(function(admin) {
                    var adminData = {userId: admin.id, businessId: businessId};

                    Promise.ninvoke(BusinessMember, 'findOrCreate', {where: adminData}, {
                        businessId: businessId,
                        userId: admin.id,
                        gender: admin.gender,
                        firstName: admin.firstName,
                        lastName: admin.lastName,
                        email: admin.email,
                        phoneNumber: admin.phoneNumber,
                        hidden: true,
                        active: true
                    });
                }))
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
            {arg: 'here', type: 'string', required: true, description: 'geo location:{lng: ,lat:}. For ex : 2.30,48.87'},
            {arg: 'query', type: 'string', description: 'plain text search'},
            {arg: 'clientTypes', type: 'array'},
            {arg: 'page', type: 'number', description: 'number of pages (page size defined by limit)'},
            {arg: 'limit', type: 'number', description: 'number of businesses to get, default=10'}
        ],
        returns: {arg: 'businesses', root: true},
        http: { verb: 'GET' }
    });

    Business.remoteMethod('search', {
        description: 'Search businesses',
        accepts: [
            {arg: 'location', type: 'object', description: 'location:{lng: ,lat:}. For ex : 2.30,48.87'},
            {arg: 'radius', type: 'number', description: 'Radius in meter around the geo location' },
            {arg: 'query', type: 'string', description: 'plain text search'},
            {arg: 'clientTypes', type: 'array'},
            {arg: 'facetFilters', type: 'array', description: 'Filters based on facets'},
            {arg: 'price', type: 'object', description: 'price:{min: ,max:}'},
            {arg: 'page', type: 'number', description: 'number of pages (page size defined by limit)'},
            {arg: 'limit', type: 'number', description: 'number of businesses to get, default=10'}
        ],
        returns: {arg: 'results', root: true},
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
