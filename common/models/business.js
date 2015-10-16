'use strict';

var Q = require('q');
var _ = require('lodash');
var GeoPoint = require('loopback-datasource-juggler/lib/geo').GeoPoint;
var getSlug = require('speakingurl');
var Control = require('../utils/AccessControl');
var Hooks = require('./hooks');
var phone = require('node-phonenumber')
var phoneUtil = phone.PhoneNumberUtil.getInstance();

var moment = require('moment');
require('moment/locale/fr');
moment.locale('fr');

var days = {
    0: "SUN",
    1: "MON",
    2: "TUE",
    3: "WED",
    4: "THU",
    5: "FRI",
    6: "SAT"
};

module.exports = function(Business) {
    Hooks.generateId(Business);
    Hooks.updateTimestamps(Business);
    Hooks.updateSearchIndex(Business, {index: 'business'});

    Business.observe('before save', function updateFriendlyId(ctx, next) {
        if(ctx.instance && !ctx.instance.friendlyId) {
            Business.findOne({order: 'friendlyId DESC', limit: 1}, function(err, b) {
                ctx.instance.friendlyId = b.friendlyId + 1;
                next();
            })
        } else {
            next();
        }

    });

    Business.validatesUniquenessOf('friendlyId');

    Business.ACCOUNT_FREE = 'FREE';
    Business.ACCOUNT_BASIC = 'BASIC';
    Business.ACCOUNT_PREMIUM = 'PREMIUM';

    Business.validatesInclusionOf('accountType', {in: [Business.ACCOUNT_FREE, Business.ACCOUNT_BASIC, Business.ACCOUNT_PREMIUM]});


    Hooks.hasImages(Business, {
        pictures: {
            container: 'businesses',
            multi: true
        }
    });

    Business.prototype.toRemoteObject = function (context) {
        var Hairfie        = Business.app.models.Hairfie,
            Hairdresser    = Business.app.models.Hairdresser,
            BusinessReview = Business.app.models.BusinessReview,
            BusinessMember = Business.app.models.BusinessMember,
            User           = Business.app.models.User;

        return Q.ninvoke(BusinessReview, 'getBusinessRating', this.id)
            .then((function (rating) {
                var activeHairdressers =
                Q
                    .npost(this, 'getVisibleActiveMembers')
                    .then(function (members) {
                        return Q.all(members.map(function (member) {
                                return member.toRemoteShortObject(context);
                        }));
                    });

                var owner = Q.npost(this, 'owner').then(function (user) {
                    return user && user.toRemoteShortObject(context);
                });

                return _.assign(this.toRemoteShortObject(context), {
                    kind               : this.kind ? this.kind : 'SALON',
                    gps                : this.gps,
                    men                : false != this.men,
                    women              : false != this.women,
                    children           : false != this.children,
                    owner              : owner,
                    description        : this.description,
                    timetable          : this.timetable,
                    numHairfies        : Q.ninvoke(Hairfie, 'count', {businessId: this.id}),
                    numReviews         : rating.numReviews,
                    rating             : rating.rating,
                    crossSell          : true,
                    isBookable         : this.isBookable(),
                    displayPhoneNumber : this.displayPhoneNumber,
                    services           : this.getServices(),
                    activeHairdressers : activeHairdressers,
                    landingPageUrl     : Business.app.urlGenerator.business(this, context),
                    facebookPage       : this.facebookPage && this.getFacebookPageObject().toRemoteShortObject(context),
                    addedCategories    : this.addedCategories,
                    labels             : this.labels,
                    accountType        : this.accountType ? this.accountType : Business.ACCOUNT_FREE,
                    createdAt          : this.createdAt,
                    updatedAt          : this.updatedAt
                });

            }).bind(this));
    };

    Business.prototype.toRemoteShortObject = function (context) {
        var streetViewPicture = Picture.fromUrl(GeoPoint(this.gps).streetViewPic(Business.app)).toRemoteObject(context);

        var pictures = (this.pictures || []).map(function (p) { return p.toRemoteObject(context); });

        var phoneNumberToDisplay = this.phoneNumber;

        if (context.isApiVersion('<1')) {
            pictures.push(streetViewPicture);
        } else {
            if(phoneNumberToDisplay) {
                phoneNumberToDisplay = phoneUtil.format(phoneUtil.parse(phoneNumberToDisplay,'FR'), phone.PhoneNumberFormat.INTERNATIONAL)
            }
        }



        return {
            id          : this.id,
            friendlyId  : this.friendlyId,
            href        : Business.app.urlGenerator.api('businesses/'+this.id),
            name        : this.name,
            slug        : this.slug(),
            phoneNumber : phoneNumberToDisplay,
            address     : this.address,
            bestDiscount: this.bestDiscount,
            averagePrice: this.averagePrice,
            pictures    : pictures,
            isBookable  : this.isBookable(),
            thumbnail   : pictures[0] // BC mobile
        };
    };

    Business.prototype.getFacebookPageObject = function () {
        var User = Business.app.models.user;

        var facebookPage = this.facebookPage || {};

        return {
            toRemoteObject: function (context) {
                return {
                    name        : facebookPage.name,
                    user        : Q.ninvoke(User, 'findById', facebookPage.userId).then(function (user) {
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


    Business.prototype.isBookable = function() {
        return _.isBoolean(this.bookable) ?  this.bookable : true;
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

        var deferred = Q.defer();

        BusinessService.find({where: where}, function(error, services) {
            if(error) deferred.reject(error);
            deferred.resolve(services);
        });

        return deferred.promise;
    };

    Business.prototype.isClaimed = function () {
        var deferred = Q.defer();
        var BusinessMember = Business.app.models.BusinessMember;
        var where = {};
        where.businessId = this.id;

        BusinessMember.findOne({where: where}, function (error, bm) {
            if (error) deferred.reject(error);
            deferred.resolve(!!bm);
        });

        return deferred.promise;
    };

    Business.prototype.toSearchDocument = function () {
        var BusinessReview = Business.app.models.BusinessReview,
            Hairfie        = Business.app.models.Hairfie;

        return Q.all([
                Q.ninvoke(BusinessReview, 'getBusinessRating', this.id),
                Q.ninvoke(Hairfie, 'count', {businessId: this.id}),
                this.getTags(),
                this.getCategories(),
                this.isClaimed()
            ])
            .spread(function (rating, numHairfies, tags, categories, isClaimed) {
                return {
                    id                 : this.id,
                    objectID           : this.id.toString(),
                    friendlyId         : this.friendlyId,
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
                    numHairfies        : numHairfies,
                    numReviews         : rating.numReviews,
                    numPictures        : this.pictures.length,
                    rating             : rating.rating,
                    crossSell          : true,
                    isBookable         : this.isBookable(),
                    bestDiscount       : this.bestDiscount,
                    createdAt          : this.createdAt,
                    _tags              : tags.map(function (t) { return t.name && t.name.fr; }),
                    categories         : _.map(categories, 'name'),
                    categoryIds        : _.map(categories, 'id'),
                    categorySlugs      : _.map(categories, 'slug'),
                    averagePrice       : this.averagePrice,
                    isClaimed          : isClaimed,
                    accountType        : this.accountType ? this.accountType : Business.ACCOUNT_FREE,
                    updatedAt          : this.updatedAt
                }
            }.bind(this));
    };

    Business.prototype.getTags = function () {
        var Tag = Business.app.models.Tag;
        var Hairfie = Business.app.models.Hairfie;
        var hairfies = Hairfie.dataSource.connector.collection(Hairfie.definition.name);

        var pipe = [
            {$match: {businessId: this.id}},
            {$unwind: "$tags"},
            {$group: {_id: "$tags"}}
        ];

        return Q.ninvoke(hairfies, 'aggregate', pipe)
            .then(function (results) {
                return Q.ninvoke(Tag, 'findByIds', _.map(results, '_id'));
            });
    };

    Business.prototype.getCategories = function () {
        var b = this;

        return b.getTags().then(function (tags) {
            return Q.all([
                Business.app.models.Category.listForTagsAndGenders(tags, b.getGenders()),
                Business.app.models.Category.getByIds(b.addedCategories)
            ])
            .spread(function(categories, addedCategories) {
                return _.union(categories, addedCategories);
            });
        });
    };

    Business.prototype.getGenders = function () {
        var gender = [];
        if (false != this.men)      gender.push("men");
        if (false != this.women)    gender.push("women");
        if (false != this.children) gender.push("children");

        return gender;
    };

    Business.afterCreate = function (next) {
        var business = this;

        Business.app.models.email.notifyAll('Business created', {
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

    function bestDiscountOfTimetable(timetable) {
        var timeWindows = _.flatten(_.values(timetable)),
            discounts   = _.reject(_.map(_.pluck(timeWindows, 'discount'), Number), _.isNaN);

        return _.max(_.flatten([discounts, [0]]));
    }

    Business.observe('before save', function updateBestDiscount(ctx, next) {
        if (ctx.instance) {
            ctx.instance.bestDiscount = bestDiscountOfTimetable(ctx.instance.timetable);
        } else {
            // update only when timetable is updated
            if (!_.isUndefined(ctx.data.timetable)) {
                ctx.data.bestDiscount = bestDiscountOfTimetable(ctx.data.timetable);
            }
        }

        next();
    });

    /**
     * Query params:
     * - q
     * - query (deprecated)
     * - location
     * - facetFilters
     * - clientTypes (deprecated)
     * - page
     * - limit
     */
    Business.nearby = function(req) {

        var params = {};

        if(req.query.here) req.query.location = req.query.here;

        params.maxDistance  = 8000;
        params.location     = GeoPoint(req.query.location);
        params.page         = Math.max(req.query.page || 1),
        params.limit        = Math.min(req.query.limit || 10, 100),
        params.skip         = params.limit * (params.page - 1),
        params.q            = req.query.q || req.query.query;

        params.facetFilters = req.query.facetFilters;
        params.clientTypes = req.query.clientTypes;

        if(params.q && params.q.length != 0 || params.facetFilters && params.facetFilters.length != 0) {
            return Q.ninvoke(Business, 'algoliaSearch', params)
                .then(processAlgoliaForNearby);
        } else {
            return Q.ninvoke(Business, 'mongoNearby', params.location, params.clientTypes, params.skip, params.limit)
                .then(function(result) {
                    // Fix me by instantiating business from JSON
                    return Q.ninvoke(Business, 'findByIds', _.pluck(result, '_id'));
                });
        }
    }

    /**
     * Query params:
     * - q
     * - query (deprecated)
     * - location
     * - radius
     * - bounds
     * - facetFilters
     * - clientTypes (deprecated)
     * - price
     * - withDiscount
     * - page
     * - limit
     */
    Business.search = function(req) {
        var params = {};

        params.maxDistance  = req.query.radius || 10000,
        params.location     = req.query.location ? GeoPoint(req.query.location) : null,
        params.bounds       = !req.query.bounds ? undefined : {
                                    northEast: GeoPoint(req.query.bounds.northEast),
                                    southWest: GeoPoint(req.query.bounds.southWest)
                                },
        params.facetFilters = req.query.facetFilters,
        params.page         = Math.max(req.query.page || 1),
        params.limit        = Math.min(req.query.limit || 10, 100),
        params.skip         = params.limit * (params.page - 1),
        params.withDiscount = req.query.withDiscount,
        params.q            = req.query.q || req.query.query;

        return Q.ninvoke(Business, 'algoliaSearch', params)
            .then(processAlgoliaForSearch);
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

    Business.algoliaSearch = function(params, callback)  {
        var AlgoliaSearchEngine = Business.app.models.AlgoliaSearchEngine;

        // TODO : MERGE params and algolia params.

        var algoliaParams = {
            hitsPerPage: params.limit,
            page: params.page - 1,
            facets: '*'
        };

        var numericFiltersArr = [];
        var facetFiltersArr = [];

        var location    = params.location ? GeoPoint(params.location) : null,
            bounds      = !params.bounds ? undefined : {
                northEast: GeoPoint(params.bounds.northEast),
                southWest: GeoPoint(params.bounds.southWest)
            };

        if (location) {
            algoliaParams.aroundLatLng = location.asLatLngString(),
            algoliaParams.aroundRadius = params.maxDistance,
            algoliaParams.aroundPrecision = 10
        }

        if (bounds) {
            algoliaParams.insideBoundingBox = bounds.northEast.asLatLngString()+','+bounds.southWest.asLatLngString();
        }

        if(params.genders) {
            params.facetFilters += ',(' + _.map(params.genders, function(gender) {
                return "genders:"+gender;
            }).join(',') + ')';
        }

        if(params.facetFilters) {
            _.forEach(params.facetFilters, function(filters, facetFilter) {
                filters = _.isArray(filters) ? filters : [filters];
                var filterToPush = _.map(_.toArray(filters), function(filter) {
                    return facetFilter + ':' + filter;
                }).join(',');

                if (facetFilter == 'categories') {
                    facetFiltersArr.push('(' + filterToPush + ')');
                } else {
                    facetFiltersArr.push(filterToPush)
                }
            });
        }

        if(params.price && params.price.min) {
            numericFiltersArr.push('(averagePrice.men>' + params.price.min + ',averagePrice.women>' + params.price.min + ')');
        }

        if(params.price && params.price.max) {
            numericFiltersArr.push('(averagePrice.men<' + price.max + ',averagePrice.women<' + params.price.max + ')');
        }

        if(params.withDiscount) {
            numericFiltersArr.push('(bestDiscount>0)');
        }

        if(numericFiltersArr.length > 0) {
            algoliaParams.numericFilters = numericFiltersArr.join(',');
        }

        if(facetFiltersArr.length > 0) {
            algoliaParams.facetFilters = facetFiltersArr.join(',');
        }

        var query = params.q || '';

        console.log("algoliaParams", algoliaParams);

        return AlgoliaSearchEngine.search('business', query, algoliaParams)
            .nodeify(callback);
    }

    function processAlgoliaForSearch(result) {
        var ids = result.hits.map(function (hit) { return hit.id; });
        return Q.denodeify(Business.findByIds.bind(Business))(ids)
            .then(function(businesses) {
                return {
                    toRemoteObject: function (context) {
                        return {
                            hits: _.map(businesses, function(business) {
                                return business.toRemoteObject(context)
                            }),
                            facets: result.facets,
                            nbHits : result.nbHits,
                            page : result.page + 1,
                            nbPages : result.nbPages,
                            hitsPerPage : result.hitsPerPage
                        }
                    }
                }
            });
    }

    function processAlgoliaForNearby(result) {
        var ids = result.hits.map(function (hit) { return hit.id; });

        return Q.denodeify(Business.findByIds.bind(Business))(ids)
            .then(function(businesses) {
                return {
                    toRemoteObject: function (context) {
                        return _.map(businesses, function(business) {
                            return business.toRemoteObject(context)
                        })
                    }
                }
            });
    }

    Business.similar = function (businessId, limit, callback) {
        var AlgoliaSearchEngine = Business.app.models.AlgoliaSearchEngine;
        var maxDistance = 5000,
            limit       = Math.min(limit || 10, 100);

        return Q.denodeify(Business.findById.bind(Business))(businessId)
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
                result.hits = _.filter(result.hits, function(business) { return business.id != businessId });
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

                return Q.ninvoke(Business, 'findById', businessId);
            })
            .then(function (business) {
                if (!business || !business.facebookPage) return cb({statusCode: 404});

                cb(null, business.getFacebookPageObject(context));
            })
            .fail(cb);
    };

    Business.saveFacebookPage = function (businessId, data, user, cb) {
        if (!user) return cb({statusCode: 401});

        user.isManagerOfBusiness(businessId)
            .then(function (isManager) {
                if (!isManager) return cb({statusCode: 403});

                return Q.ninvoke(Business, 'findById', businessId);
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
                        cb(null, business.getFacebookPageObject(context));
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

                return Q.ninvoke(Business, 'findById', businessId);
            })
            .then(function (business) {
                if (!business) return cb({statusCode: 404});

                business.facebookPage = null;
                return Q.ninvoke(business, 'save');
            })
            .then(cb.bind(null, null), cb);
    };

    Business.prototype.getCustomersObject = function () {
        var User = Business.app.models.user,
            Hairfie = Business.app.models.Hairfie;

        var filter = {where: {businessId: this.id, customerEmail: {neq: null}}, order: 'createdAt DESC'};

        var deferred  = Q.defer();


        Hairfie.find(filter, function(error, hairfies) {
            if (error) return deferred.reject(error);
            if(hairfies.length === 0) return deferred.resolve([]);
            var customers = hairfies.map(function(hairfie) {
                return {
                    email      : hairfie.customerEmail,
                    hairfie    : hairfie.toRemoteObject(context)
                };
            });
            var result = _.reduce(customers, function (prev, current) {
                var customer = _.find(prev, function (old) {
                    return old.email === current.email;
                });
                if (customer === undefined) {
                    current.numHairfies = 1;
                    current.hairfies = [current.hairfie];
                    delete current.hairfie;
                    prev.push(current);
                } else {
                    if (!_.isArray(customer.hairfies)) {
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

    Business.prototype.getGenderArray = function () {
        var gender = [];
        if (false != this.men)      gender.push("men");
        if (false != this.women)    gender.push("women");
        if (false != this.children) gender.push("children");

        return gender;
    };

    Business.getCustomers = function (businessId, user, cb) {
        if (!user) return cb({statusCode: 401});

        user.isManagerOfBusiness(businessId)
            .then(function (isManager) {
                if (!isManager) return cb({statusCode: 403});

                return Q.ninvoke(Business, 'findById', businessId);
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

        return Q.ninvoke(Business, 'findById', businessId)
            .then(function(business) {
                if (!business) return cb({statusCode: 404});
                return business.isClaimed()
            })
            .then(function(isClaimed) {
                if (isClaimed) return cb({statusCode: 403});

                return Q.ninvoke(BusinessMember, 'create', {
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
                return Q.ninvoke(User, 'findByIds', adminIds)
            })
            .then(function(admins) {
                return Q.all(admins.map(function(admin) {
                    var adminData = {userId: admin.id, businessId: businessId};

                    Q.ninvoke(BusinessMember, 'findOrCreate', {where: adminData}, {
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


    Business.tags = function (businessId, callback) {
        var Tag = Business.app.models.Tag;

        return Q.ninvoke(Business, 'findById', businessId)
            .then(function(business) {
                return business.getHairfieTagCounts();
            })
            .then(function(hairfieTagCounts) {
                return Q.all([
                    Q.ninvoke(Tag, 'findByIds', _.keys(hairfieTagCounts)),
                    hairfieTagCounts
                ]);
            })
            .then(function(arr) {
                var tags = arr[0],
                    hairfieTagCounts = arr[1];

                return {toRemoteObject: function (context) {
                    return _.sortBy(_.map(tags, function(tag) {
                        return {
                            tag: tag.toRemoteObject(context),
                            tagCount: hairfieTagCounts[tag.id]
                        };
                    }), 'tagCount').reverse();
                }};
            });
    };

    function parseDay(day, interval, delay) {
        var newBattlements = [];
        _.map(day, function(timeslots) {
            var i;
            for (i = 0; moment(timeslots.endTime, "HH:mm") >= moment(timeslots.startTime, "HH:mm").add((i + 1) * interval, "m"); i++) {
                if (!(delay && delay > moment(timeslots.startTime, "HH:mm").add(i * interval, "m").hours()))
                    newBattlements.push({
                        startTime: moment(timeslots.startTime, "HH:mm").add(i * interval, "m").format("HH:mm"),
                        endTime: moment(timeslots.startTime, "HH:mm").add((i + 1) * interval, "m").format("HH:mm"),
                        discount: timeslots.discount || ""
                    });
            }
        });
        return newBattlements;
    }

    Business.timeslots = function (businessId, from, until, next) {
        var interval = 60; //60 Minutes between each timeslot
        var delay = 24; //Numbers minimum hours before the first timeslots bookable

        if (moment(from) > moment(until))
            next({statusCode: 400, message: 'from must to be before until (time)'});

        if (moment(from) < moment())
            from = moment().format("YYYY-MM-DD");

        return Q.ninvoke(Business, 'findById', businessId)
            .then(function (business) {
                var timeslots = {};
                var day;
                var date;
                var i;

                for (i = 0; moment(from) <= moment(from).add(i, 'd') && moment(until) >= moment(from).add(i, 'd'); i++) {
                    date = moment(from).add(i, 'd').format("YYYY-MM-DD");

                    if (!(business.exceptions && business.exceptions[date])) {
                        day = moment(from).add(i, 'd').days();
                        day = days[day];
                        day = business.timetable && business.timetable[day];
                    } else {
                        day = business.exceptions[date];
                    }

                    if (delay <= 0) {
                        timeslots[date] = parseDay(day, interval);
                    }
                    else if (delay < 24 && !(_.isEmpty(day))) {
                        timeslots[date] = parseDay(day, interval, delay);
                        delay = 0;
                    }
                    else if (!_.isEmpty(day)) {
                        delay -= 24;
                    }
                }
                return timeslots;
            })
        next();
    };

    Business.beforeRemote('*.updateAttributes', Control.isAuthenticated(function (ctx, unused, next) {
        ctx.req.user.isManagerOfBusiness(ctx.instance.id)
            .then(function (isManager) {
                if (!isManager) return next({statusCode: 403});

                if (ctx.req.body.pictures) {
                    var pattern = /^((http|https):\/\/)/;
                    ctx.req.body.pictures = _.filter(ctx.req.body.pictures, function(url) { return !pattern.test(url)});
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
            {arg: 'req', type: 'object', 'http': {source: 'req'}}
        ],
        returns: {arg: 'businesses', root: true},
        http: { verb: 'GET' }
    });

    Business.remoteMethod('search', {
        description: 'Search businesses',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}},
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

    Business.remoteMethod('tags', {
        description: 'Get tags for Hairfie',
        accepts: [
            {arg: 'businessId', type: 'string', description: 'ID of the reference business'}
        ],
        returns: {arg: 'businesses', root: true},
        http: { verb: 'GET', path: '/:businessId/tags' }
    });

    Business.remoteMethod('timeslots', {
        description: 'Get timeslots from timetable',
        accepts: [
            {arg: 'businessId', type: 'string', description: 'ID of the reference business'},
            {arg: 'from', type: 'string', description: 'start date'},
            {arg: 'until', type: 'string', description: 'end date'}
        ],
        returns: {arg: 'timeslots', root: true},
        http: { verb: 'GET', path: '/:businessId/timeslots' }
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
