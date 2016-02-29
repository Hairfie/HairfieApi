'use strict';

var Q = require('q');
var _ = require('lodash');
var GeoPoint = require('loopback-datasource-juggler/lib/geo').GeoPoint;
var getSlug = require('speakingurl');
var Control = require('../utils/AccessControl');
var Hooks = require('./hooks');
var BusinessUtils = require('./business-utils');
var nodePhone = require('node-phonenumber')
var phoneUtil = nodePhone.PhoneNumberUtil.getInstance();

var moment = require('moment');
require('moment/locale/fr');
moment.locale('fr');

var days = require("../utils/days.js");


module.exports = function(Business) {
    Hooks.generateId(Business);
    Hooks.updateTimestamps(Business);
    Hooks.updateSearchIndex(Business, {index: 'business'});

    Hooks.hasImages(Business, {
        pictures: {
            container: 'businesses',
            multi: true
        }
    });

    Business.validatesUniquenessOf('friendlyId');

    BusinessUtils.facebookPage(Business);
    BusinessUtils.yelp(Business);
    BusinessUtils.timeslots(Business);

    Business.ACCOUNT_FREE = 'FREE';
    Business.ACCOUNT_BASIC = 'BASIC';
    Business.ACCOUNT_PREMIUM = 'PREMIUM';

    Business.ACCOUNT_TYPE_VALUE = function(accountType) {
        switch(accountType) {
            case Business.ACCOUNT_PREMIUM:
                return 2;
            case Business.ACCOUNT_BASIC:
                return 1;
            default:
                return 0;
        }
    }

    Business.validatesInclusionOf('accountType', {in: [Business.ACCOUNT_FREE, Business.ACCOUNT_BASIC, Business.ACCOUNT_PREMIUM]});


    Business.prototype.toRemoteObject = function (context) {
        var Hairfie        = Business.app.models.Hairfie,
            Hairdresser    = Business.app.models.Hairdresser,
            BusinessReview = Business.app.models.BusinessReview,
            BusinessMember = Business.app.models.BusinessMember,
            User           = Business.app.models.User;

        var numHairfies = null;
        if (!this.numHairfies && this.numHairfies != 0) {
            numHairfies = Q.ninvoke(Hairfie, 'count', {businessId: this.id})
                .then(function (numHairfies) {
                    this.numHairfies = numHairfies;
                    Q.ninvoke(this, 'save');
                    return numHairfies;
                }.bind(this));
        }
        if (context.isApiVersion('<1.2')) {
            console.log("members ...");
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

            var services = this.getServices();
        }

        return _.assign(this.toRemoteShortObject(context), {
            kind               : this.kind ? this.kind : 'SALON',
            gps                : this.gps,
            men                : false != this.men,
            women              : false != this.women,
            children           : false != this.children,
            owner              : owner,
            description        : this.description,
            timetable          : this.timetable,
            numHairfies        : this.numHairfies || numHairfies || 0,
            crossSell          : true,
            isBookable         : this.isBookable(),
            displayPhoneNumber : this.displayPhoneNumber,
            activeHairdressers : activeHairdressers,
            services           : services,
            landingPageUrl     : Business.app.urlGenerator.business(this, context),
            facebookPage       : this.facebookPage && this.getFacebookPageObject().toRemoteShortObject(context),
            addedCategories    : this.addedCategories,
            hairfiesCategories : this.hairfiesCategories,
            categories         : this.categories,
            selections         : this.selections,
            labels             : this.labels,
            createdAt          : this.createdAt,
            updatedAt          : this.updatedAt
        });
    };

    Business.prototype.toRemoteShortObject = function (context) {
        var pictures = (this.pictures || []).map(function (p) { return p.toRemoteObject(context); });

        if (context.isApiVersion('<1')) {
            var streetViewPicture = Picture.fromUrl(GeoPoint(this.gps).streetViewPic(Business.app)).toRemoteObject(context);
            if(pictures.length == 0) pictures.push(streetViewPicture);
        }

        var rating = null;
        if (!this.rating && this.numReviews != 0) {
            rating = Q.ninvoke(Business, 'getRating', this.id);
        }

        return {
            id          : this.id,
            friendlyId  : this.friendlyId,
            href        : Business.app.urlGenerator.api('businesses/'+this.id),
            name        : this.name,
            slug        : this.slug(),
            phoneNumber : this.getPhoneNumber(),
            address     : this.address,
            bestDiscount: this.bestDiscount,
            averagePrice: this.averagePrice,
            priceLevel  : this.priceLevel || null,
            rating      : this.rating || (rating && rating.rating) || null,
            numReviews  : this.numReviews || (rating && rating.numReviews) || 0,
            profilePicture: this.profilePicture && this.profilePicture.toRemoteShortObject(context),
            pictures    : pictures,
            isBookable  : this.isBookable(),
            accountType : this.accountType ? this.accountType : Business.ACCOUNT_FREE,
            yelpObject  : this.yelpObject,
            yelpId      : this.yelpId || (this.yelpObject && this.yelpObject.id) || null,
            displayYelp : this.displayYelp ? this.displayYelp : false,
            thumbnail   : pictures[0] // BC mobile
        };
    };


    Business.observe('before save', function updateFriendlyId(ctx, next) {
        if(ctx.instance && !ctx.instance.friendlyId) {
            Business.findOne({order: 'friendlyId DESC', limit: 1}, function(err, b) {
                ctx.instance.friendlyId = +b.friendlyId+1;
                next();
            })
        } else {
            next();
        }
    });


    Business.prototype.slug = function () {
        return getSlug(this.name);
    };

    Business.prototype.getPhoneNumber = function() {
        if(!this.phoneNumber) return;

        return phoneUtil.format(phoneUtil.parse(this.phoneNumber,'FR'), nodePhone.PhoneNumberFormat.E164)
    };

    function cleanPhoneNumber(business) {
        var phoneNumber = phoneUtil.format(phoneUtil.parse(business.phoneNumber,'FR'), nodePhone.PhoneNumberFormat.E164);

        if(phoneNumber) {
            business.oldPhoneNumber = business.phoneNumber;
            business.phoneNumber = phoneNumber;
        }

        return business;
    }

    Business.observe('before save', function(ctx, next) {
        if(ctx.instance) {
            ctx.instance = cleanPhoneNumber(ctx.instance);
        } else if (ctx.data && !_.isUndefined(ctx.data.phoneNumber)) {
            ctx.currentInstance = cleanPhoneNumber(ctx.data);
        }
        next();
    });

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

    function bayesianAverage(review_count, rating) {
        var C = 5;
        var m = 3;

        return (C*m + rating*review_count) / (C +review_count);
    } 

    Business.prototype.toSearchDocument = function () {
        var BusinessReview = Business.app.models.BusinessReview,
            Hairfie        = Business.app.models.Hairfie;

        return Q.all([
                Q.ninvoke(Hairfie, 'count', {businessId: this.id}),
                this.getTags(),
                this.getCategories(),
                this.isClaimed()
            ])
            .spread(function (numHairfies, tags, categories, isClaimed) {
                var yelpScore = (this.yelpObject && this.yelpObject.review_count) ? bayesianAverage(this.yelpObject.review_count, this.yelpObject.rating) : 0;

                if (this.yelpObject && this.yelpObject.review_count) {
                    console.log("YelpScore : %s with %s reviews and average %s", yelpScore, this.yelpObject.review_count, this.yelpObject.rating);
                }

                var relevanceScore = 0.38 * Business.ACCOUNT_TYPE_VALUE(this.accountType) / 2
                    + 0.19 * (this.rating || 0) / 100
                    + 0.19 * Math.min((this.numHairfies || 0) / 50, 1) 
                    + 0.19 * Math.min((this.numReviews || 0) / 20, 1)
                    + 0.05 * yelpScore / 5;

                if(this.forcedRelevanceScore) relevanceScore = this.forcedRelevanceScore;

                console.log("relevanceScore for %s : %s", this.name, relevanceScore);

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
                    openOnSunday       : (this.timetable && !_.isEmpty(this.timetable[days[0]])) ? true : false,
                    openOnMonday       : (this.timetable && !_.isEmpty(this.timetable[days[1]])) ? true : false,
                    openOnTuesday      : (this.timetable && !_.isEmpty(this.timetable[days[2]])) ? true : false,
                    openOnWednesday    : (this.timetable && !_.isEmpty(this.timetable[days[3]])) ? true : false,
                    openOnThursday     : (this.timetable && !_.isEmpty(this.timetable[days[4]])) ? true : false,
                    openOnFriday       : (this.timetable && !_.isEmpty(this.timetable[days[5]])) ? true : false,
                    openOnSaturday     : (this.timetable && !_.isEmpty(this.timetable[days[6]])) ? true : false,
                    timetable          : this.timetable,
                    numHairfies        : numHairfies,
                    numReviews         : this.numReviews || 0,
                    numPictures        : this.pictures.length,
                    rating             : this.rating || null,
                    crossSell          : true,
                    isBookable         : this.isBookable(),
                    bestDiscount       : this.bestDiscount,
                    priceLevel  : this.priceLevel || null,
                    createdAt          : this.createdAt,
                    _tags              : tags.map(function (t) { return t.name && t.name.fr; }),
                    categories         : _.map(categories, 'name'),
                    categoryIds        : _.map(categories, 'id'),
                    categorySlugs      : _.map(categories, 'slug'),
                    averagePrice       : this.averagePrice,
                    isClaimed          : isClaimed,
                    accountType        : this.accountType ? this.accountType : Business.ACCOUNT_FREE,
                    accountTypeValue   : Business.ACCOUNT_TYPE_VALUE(this.accountType),
                    relevanceScore     : relevanceScore,
                    yelpObject         : this.yelpObject,
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

        return Q.all([
                Business.app.models.Category.listGenders(b.getGenders()),
                Business.app.models.Category.getByIds(b.categories)
            ])
            .spread(function(genderCategories, categories) {
                return _.uniq(_.union(genderCategories, categories), 'slug');
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

    function bestDiscountOfTimetable(timetable) {
        var timeWindows = _.flatten(_.values(timetable)),
            discounts   = _.reject(_.map(_.map(timeWindows, 'discount'), Number), _.isNaN);

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

    function updateCategories(business) {
        if (business && business.addedCategories && !_.isEmpty(business.addedCategories)) {
            business.categories = business.addedCategories;
        } else if (business && business.hairfiesCategories && !_.isEmpty(business.hairfiesCategories)) {
            business.categories = business.hairfiesCategories;
        }
        return business;
    }

    Business.observe('before save', function(ctx, next) {
        if(ctx.instance) {
            ctx.instance = updateCategories(ctx.instance);
        } else if (ctx.data && !_.isUndefined(ctx.data.addedCategories)) {
            ctx.currentInstance = updateCategories(ctx.data);
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
                    return Q.ninvoke(Business, 'findByIds', _.map(result, '_id'));
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

    Business.getRating = function(businessId) {
        var BusinessReview = Business.app.models.BusinessReview;
        return Q.all([
            Q.ninvoke(BusinessReview.app.models.Business, 'findById', businessId),
            Q.ninvoke(BusinessReview, 'getBusinessRating', businessId)
        ])
        .spread(function (business, rating) {
            business.rating = rating.rating || null;
            business.numReviews = rating.numReviews || 0;
            return Q.ninvoke(business, 'save')
        })
    }

    Business.search = function(req) {
        var params = {};
        console.log("skip", req.query.skip);
        console.log("page", req.query.page);
        console.log("limit", req.query.limit);

        var limit = req.query.limit ? req.query.limit : 10;
        var page = 1;

        if(req.query.skip) {
            page = Math.floor(req.query.skip/limit) + 1;
        } else if(req.query.page) {
            page = Math.max(req.query.page || 1);
        }

        //params.skip         = params.limit * (params.page - 1),

        params.maxDistance  = req.query.radius || 10000,
        params.location     = req.query.location ? GeoPoint(req.query.location) : null,
        params.bounds       = !req.query.bounds ? undefined : {
                                    northEast: GeoPoint(req.query.bounds.northEast),
                                    southWest: GeoPoint(req.query.bounds.southWest)
                                },
        params.facetFilters = req.query.facetFilters,
        params.page         = page,
        params.limit        = Math.min(limit, 100),
        params.withDiscount = req.query.withDiscount,
        params.q            = req.query.q || req.query.query;

        if(req.query.price) {
            params.price = {
                min: req.query.price.min || null,
                max: req.query.price.max || null
            }
        }

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
        var optionalFacetFilterArr = [];

        var location    = params.location ? GeoPoint(params.location) : null,
            bounds      = !params.bounds ? undefined : {
                northEast: GeoPoint(params.bounds.northEast),
                southWest: GeoPoint(params.bounds.southWest)
            };

        if (location) {
            algoliaParams.aroundLatLng = location.asLatLngString(),
            algoliaParams.aroundRadius = params.maxDistance,
            algoliaParams.aroundPrecision = 1000
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

                // if (facetFilter == 'categories' || facetFilter == 'categorySlugs') {
                //     //facetFiltersArr.push('(' + filterToPush + ')');
                // } else {
                    facetFiltersArr.push(filterToPush)
                // }
            });
        }

        if(params.price && params.price.min) {
            numericFiltersArr.push('(averagePrice.men>' + params.price.min + ',averagePrice.women>' + params.price.min + ')');
        }

        if(params.price && params.price.max) {
            numericFiltersArr.push('(averagePrice.men<' + params.price.max + ',averagePrice.women<' + params.price.max + ')');
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

        if(optionalFacetFilterArr.length > 0) {
            algoliaParams.optionalFacetFilters = optionalFacetFilterArr.join(',');
        }

        var query = params.q || '';

        console.log("algoliaParams", algoliaParams);

        return AlgoliaSearchEngine.search('business', query, algoliaParams)
            .nodeify(callback, algoliaParams);
    }

    function processAlgoliaForSearch(result, algoliaParams) {
        var ids = result.hits.map(function (hit) { return hit.id; });
        console.log("params in result ?", algoliaParams);
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
        var maxDistance = 2000,
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

                return Q.all([
                    AlgoliaSearchEngine.search('business', '', _.assign({}, params, {hitsPerPage: 1, facetFilters: 'accountType:PREMIUM'})),
                    AlgoliaSearchEngine.search('business', '', _.assign({}, params, {facetFilters: '(accountType:PREMIUM,accountType:BASIC)'})),
                    AlgoliaSearchEngine.search('business', '', params)
                    ])
                    .spread(function(premium, basic, free) {
                        var hits = _.uniq(premium['hits'].concat(basic['hits']).concat(free['hits']));
                        var results = {
                            hits: _.filter(hits, function(business) { return business.id != businessId }).slice(0, limit)
                        };
                        return results;
                    });
            })
            .then(processAlgoliaForNearby)
            .nodeify(callback);
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
