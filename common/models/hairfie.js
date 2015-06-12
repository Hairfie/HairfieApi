'use strict';

var Q = require('q');
var _ = require('lodash');
var Hooks = require('./hooks');

module.exports = function (Hairfie) {
    Hooks.generateId(Hairfie);
    Hooks.updateTimestamps(Hairfie);
    Hooks.updateSearchIndex(Hairfie, {index: 'hairfie'});
    Hooks.hasImages(Hairfie, {
        pictures: {
            container: 'hairfies',
            multi: true
        }
    });

    Hairfie.validate('price', function (onError) {
        // validate structure
        if (undefined == this.price) return;
        if (typeof this.price != 'object') return onError();
        if (undefined == this.price.amount || undefined == this.price.currency) return onError();

        // validate amount
        var amount = parseFloat(this.price.amount);
        if (isNaN(amount) || amount < 0) return onError();

        // validate currency
        if (this.price.currency != 'EUR') return onError();
    });

    Hairfie.validate('pictures', function (reject) { (this.pictures || []).length > 0 || reject() }, {message: 'at least one'});

    Hairfie.validateAsync('businessId', function (onError, onDone) {
        if (!this.businessId) return onDone(); // business is optional

        this.business(function (error, business) {
            if (error || !business) onError();
            onDone();
        });
    }, {message: 'exists'});
    Hairfie.validateAsync('tags', function (onError, onDone) {
        if (!Array.isArray(this.tags) || 0 == this.tags.length) return onDone();

        this.getTags().then(function (tags) {
            if (tags.length != this.tags.length) return onError();
            onDone();
        }.bind(this), onError);
    }, {message: 'all exist'});

    Hairfie.prototype.toRemoteObject = function (context) {
        var businessMember = Q.npost(this, 'businessMember').then(function (businessMember) {
            return businessMember && businessMember.toRemoteShortObject(context);
        });

        return _.assign(this.toRemoteShortObject(context), {
            author          : Q.ninvoke(this.author).then(function (author) {
                return author ? author.toRemoteShortObject(context) : null;
            }),
            business        : Q.ninvoke(this.business).then(function (business) {
                return business ? business.toRemoteShortObject(context) : null;
            }),
            hairdresser     : businessMember, // NOTE: BC
            businessMember  : businessMember,
            numLikes        : this.getNumLikes(),
            selfMade        : !!this.selfMade,
            tags            : this.getTags().then(function (tags) {
                return tags ? tags.map(function (tag) { return tag.toRemoteShortObject(context) }) : null;
            }),
            displayBusiness : this.displayBusiness(),
            hidden          : this.hidden,
            createdAt       : this.createdAt,
            updatedAt       : this.updatedAt
        });
    };

    Hairfie.prototype.toRemoteShortObject = function (context) {
        var pictures = (this.pictures || []).map(function (p) { return p.toRemoteShortObject(context); });

        return {
            id              : this.id,
            href            : Hairfie.app.urlGenerator.api('hairfies/'+this.id),
            picture         : _.first(pictures),
            pictures        : pictures,
            price           : this.price,
            description     : this.description ? this.description : '',
            landingPageUrl  : Hairfie.app.urlGenerator.hairfie(this, context),
        };
    };

    Hairfie.prototype.toSearchDocument = function () {
        return Q
            .all([
                this.getBusiness(),
                this.getTags(),
                this.getCategories(),
                this.getNumLikes(),
                this.getLastLike()
            ])
            .spread(function (business, tags, categories, numLikes, lastLike) {
                return {
                    objectID    : this.id,
                    price       : this.price,
                    numLikes    : numLikes,
                    business    : business && {
                        name        : business.name,
                        address     : business.address,
                    },
                    _geoloc     : business && {
                        lat : business.gps.lat,
                        lng : business.gps.lng
                    },
                    _tags       : tags.map(function (t) { return t.name && t.name.fr; }),
                    categories  : categories.map(function (c) { return c.name; }),
                    lastLikeAt  : lastLike && lastLike.createdAt,
                    createdAt   : this.createdAt
                }
            }.bind(this));
    };

    Hairfie.prototype.displayBusiness = function(authorId) {
        if (!this.businessId) return Q(false);

        var businessId = this.businessId;
        return Q.npost(this, 'author')
            .then(function (user) {
                return !!user && user.isManagerOfBusiness(businessId);
            });
    };

    Hairfie.prototype.getBusiness = function () {
        return Q.ninvoke(this, 'business');
    };

    Hairfie.prototype.getNumLikes = function () {
        return Q.ninvoke(Hairfie.app.models.HairfieLike, 'count', {hairfieId: this.id});
    };

    Hairfie.prototype.getLastLike = function () {
        return Q.ninvoke(Hairfie.app.models.HairfieLike, 'findOne', {
            where: {
                hairfieId: this.id
            },
            order: 'createdAt DESC'
        });
    };

    Hairfie.prototype.getTags = function () {
        return Q.ninvoke(Hairfie.app.models.Tag, 'findByIds', this.tags || []);
    };

    Hairfie.prototype.getCategories = function () {
        return this.getTags().then(function (tags) {
            return Hairfie.app.models.Category.listForTagsAndGenders(tags);
        });
    };

    Hairfie.hide = function (req, next) {
        if (!req.user) return next({statusCode: 401});

        Hairfie.findById(req.params.hairfieId, function (error, hairfie) {
            if (error) return next({statusCode: 500});
            if (!hairfie) return next({statusCode: 404});
            if (hairfie.authorId.toString() != req.user.id.toString()) return next({statusCode: 403});
            hairfie.updateAttributes({hidden: true}, function(error, hairfie) {
                if (error) return next({statusCode: 500});
                return next();
            })
        });
    };

    Hairfie.share = function (req, next) {
        var HairfieShare = Hairfie.app.models.HairfieShare;

        if (!req.user) return next({statusCode: 401});

        var networks = [];
        if (req.body.facebook) networks.push('facebook');
        if (req.body.facebookPage) networks.push('facebookPage');

        Q.ninvoke(Hairfie, 'findById', req.params.hairfieId)
            .then(function (hairfie) {
                if (!hairfie) return next({statusCode: 404});
                if (hairfie.authorId.toString() != req.user.id.toString()) return next({statusCode: 403});

                return [
                    hairfie,
                    Q.npost(hairfie, 'business')
                ];
            })
            .spread(function (hairfie, business) {
                return [
                    hairfie,
                    business,
                    !!business && req.user.isManagerOfBusiness(business.id)
                ];
            })
            .spread(function (hairfie, business, isManager) {
                var fbPage = req.body.facebookPage;
                if (fbPage && !business) return next({statusCode: 400, message: 'facebookPage: Hairfie has no business'});
                if (fbPage && !isManager) return next({statusCode: 403, message: 'facebookPage: User is not manager'});

                return HairfieShare.share(req.user, hairfie, networks);
            })
            .then(next.bind(null, null), next);
    };

    Hairfie.getBusinessAveragePriceForTag = function (businessId, tagId, callback) {
        var collection = Hairfie.dataSource.connector.collection(Hairfie.definition.name);
        var pipe = [
            {$match: {businessId: businessId, tags: tagId}},
            {$group: {_id: null, numHairfies: {$sum: 1}, amount: {$avg: "$price.amount"}}}
        ];

        collection.aggregate(pipe, function (error, result) {
            if (error) return callback(error);

            var averagePrice = {
                amount: null,
                numHairfies: 0
            }


            if (1 === result.length) {
                averagePrice.amount = result[0].amount;
                averagePrice.numHairfies  = result[0].numHairfies;
            }

            callback(null, averagePrice);
        });
    };

    // set user id from access token
    Hairfie.beforeRemote('create', function (ctx, unused, next) {
        ctx.req.body.authorId = ctx.req.accessToken.userId;

        // keep backward compatibility (hairdressers -> business members)
        if (!ctx.req.body.businessMemberId) ctx.req.body.businessMemberId = ctx.req.body.hairdresserId;
        delete ctx.req.body.hairdresserId;

        next();
    });

    function createReviewRequest(hairfie) {
        if (!hairfie.customerEmail || !hairfie.businessId) return Q(null);

        return Q.ninvoke(Hairfie.app.models.BusinessReviewRequest, 'create', {
            businessId  : hairfie.businessId,
            hairfieId   : hairfie.id,
            email       : hairfie.customerEmail
        });
    }

    function getAveragePriceForTag(hairfie, tagName) {
        if (!hairfie.businessId) return Q(null);
        var Tag = Hairfie.app.models.Tag;


        return Q.ninvoke(Tag, 'findOne', {where: {or: [{"name.fr": tagName}, {"name.en": tagName}] }})
            .then(function(tag) {
                return Q.ninvoke(Hairfie, 'getBusinessAveragePriceForTag', hairfie.businessId, tag.id);
            });
    }

    Hairfie.afterCreate = function (next) {
        var Email = Hairfie.app.models.email;

        Q.all([
            Q.ninvoke(this, 'author'),
            Q.ninvoke(this, 'business'),
            createReviewRequest(this),
            Q.ninvoke(this, 'businessMember'),
            this.getTags(),
            getAveragePriceForTag(this, 'Man'),
            getAveragePriceForTag(this, 'Woman')

        ]).spread(function (author, business, reviewRequest, businessMember, tags, menAveragePrice, womenAveragePrice) {
            var label = 'New Hairfie';

            if (this.customerEmail) {
                Email.sendHairfie(this, author, business, businessMember).fail(console.log);
                label += ' with customerEmail !'
            }

            var emailObject = {
                'ID'              : this.id,
                'URL'             : Hairfie.app.urlGenerator.hairfie(this),
                'Business'        : business.name,
                'Hairdresser tagged' : businessMember ? businessMember.firstName + ' ' + businessMember.lastName : 'Non rempli',
                'User who posted'          : author.firstName + ' ' + author.lastName,
                'Customer email'  : this.customerEmail,
                'Tags'            : _.map(tags, function(tag) {return tag.name.fr }),
                'Business phone'  : business.phoneNumber
            };

            Email.notifyAll(label, emailObject).fail(console.log);

            // update business with tags
            business.hairfieTags = business.hairfieTags || {};
            _.map(tags, function (tag) {
                business.hairfieTags[tag.id] = (business.hairfieTags[tag.id] || 0) + 1;
            });

            business.averagePrice = {
                men: menAveragePrice.amount,
                women: womenAveragePrice.amount
            }

            business.save();

        }.bind(this));

        next();
    }

    Hairfie.listMostLikedSince = function (date, limit) {
        var deferred = Q.defer();
        var HairfieLike = Hairfie.app.models.HairfieLike;
        var collection = HairfieLike.dataSource.connector.collection(HairfieLike.definition.name);

        var pipe = [
            {$match: {createdAt: {$gte: date}}},
            {$group: {_id: '$hairfieId', count: {$sum: 1}}},
            {$sort: {count: -1}},
            {$limit: limit}
        ];

        collection.aggregate(pipe, function (error, result) {
            if (error) return deferred.reject(error);

            Hairfie.findByIds(_.pluck(result, '_id'), function (error, hairfies) {
                if (error) deferred.reject(error);
                else deferred.resolve(hairfies);
            });
        });

        return deferred.promise;
    };

    /**
     * Query params:
     * - q
     * - bounds
     * - location
     * - radius
     * - priceMin
     * - priceMax
     * - categories
     */
    Hairfie.search = function (req) {
        var params = {};
        params.page = Math.max(1, req.query.page || 1) - 1;
        params.facets = ['categories', 'price.amount', '_tags'],
        params.hitsPerPage = Math.max(1, Math.min(20, req.query.pageSize || 10));
        params.facetFilters = [];
        params.numericFilters = [];

        // search location
        if (req.query.bounds) {
            params.insideBoundingBox = req.query.bounds;
        } else if (req.query.limit) {
            params.aroundLatLng = req.query.location;
            params.aroundRadius = req.query.radius || 1000;
        }

        // pagination

        // filter by categories
        _.map(asArray(req.query.categories), function (category) {
            params.facetFilters.push('categories:'+category);
        });

        // filter by categories
        _.map(asArray(req.query.tags), function (tag) {
            params.facetFilters.push('_tags:'+tag);
        });

        // filter by price
        if (req.query.priceMin) {
            params.numericFilters.push('price.amount >= '+req.query.priceMin);
        }
        if (req.query.priceMax) {
            params.numericFilters.push('price.amount <= '+req.query.priceMax);
        }

        return Hairfie.app.models.AlgoliaSearchEngine
            .search('hairfie', req.query.q || '', params)
            .then(function (result) {
                return [
                    result,
                    Q.ninvoke(Hairfie, 'findByIds', _.pluck(result.hits, 'objectID'))
                ];
            })
            .spread(function (result, hairfies) {
                return {
                    toRemoteObject: function (context) {
                        return {
                            hits        : _.map(hairfies, function (hairfie) {
                                return hairfie.toRemoteObject(context);
                            }),
                            numHits     : result.nbHits,
                            categories  : (result.facets || {}).categories || {},
                            tags        : (result.facets || {})._tags || {},
                            price       : (result.facets_stats || {})['price.amount']
                        };
                    }
                };
            });
    };

    Hairfie.remoteMethod('share', {
        description: 'Shares a hairfie on social networks',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}}
        ],
        returns: {arg: 'result', root: true},
        http: { path: '/:hairfieId/share', verb: 'POST' }
    });

    Hairfie.remoteMethod('hide', {
        description: 'Delete the hairfie',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}}
        ],
        http: { path: '/:hairfieId', verb: 'DELETE' }
    });

    Hairfie.remoteMethod('search', {
        description: 'Search hairfies',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}}
        ],
        returns: {root: true},
        http: {path: '/search', verb: 'GET'}
    });
};

function asArray(v) {
    if (_.isArray(v)) return v;
    if (_.isUndefined(v)) return [];
    return [v];
}
