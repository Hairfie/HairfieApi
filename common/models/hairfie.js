'use strict';

var Q = require('q');
var Promise = require('../../common/utils/Promise');
var _ = require('lodash'); 
var Hooks = require('./hooks');

module.exports = function (Hairfie) {
    Hooks.generateId(Hairfie);
    Hooks.updateTimestamps(Hairfie);
    Hooks.updateSearchIndex(Hairfie, {index: 'hairfie'});
    Hooks.addToCache(Hairfie, {prefix: 'hairfie'});
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
        if (context && context.isApiVersion('<1.2.1')) {
            return Q.all([
                Q.ninvoke(this.business).then(function (business) {
                        return business ? business.toRemoteShortObject(context) : null;
                    }),
                this.getTags()
                    .then(function (tags) {
                        return tags ? tags.map(function (tag) { return tag.toRemoteShortObject(context) }) : null;
                    }),
                this.getAuthor(context).then(function (author) {
                        return author ? author.toRemoteShortObject(context) : null;
                    }),
                this.getBusinessMember().then(function (businessMember) {
                        return businessMember ? businessMember.toRemoteShortObject(context) : null;
                    })
            ]).spread(function(business, tags, author, businessMember) {

                return _.assign(this.toRemoteShortObject(context), {
                    authorId        : this.authorId,
                    author          : author,
                    business        : business,
                    hairdresser     : businessMember, // NOTE: BC
                    businessMember  : businessMember,
                    numLikes        : this.numLikes,
                    selfMade        : !!this.selfMade,
                    tags            : tags,
                    isBeforeAfter   : _.some(tags, function (tag) {
                        return tag.name == "Avant-après";
                    }),
                    displayBusiness : business ? true : false,
                    hidden          : this.hidden,
                    customerEmail   : this.customerEmail,
                    createdAt       : this.createdAt,
                    updatedAt       : this.updatedAt
                });
            }.bind(this))
        } else {
            return Q.all([
                Q.ninvoke(this.business).then(function (business) {
                        return business ? business.toRemoteShortObject(context) : null;
                    }),
                this.getTags()
                    .then(function (tags) {
                        return tags ? tags.map(function (tag) { return tag.toRemoteShortObject(context) }) : null;
                    }),
                this.getBusinessMember().then(function (businessMember) {
                        return businessMember ? businessMember.toRemoteShortObject(context) : null;
                    })
            ]).spread(function(business, tags, businessMember) {
                return _.assign(this.toRemoteShortObject(context), {
                    authorId        : this.authorId,
                    business        : business,
                    hairdresser     : businessMember, // NOTE: BC
                    businessMember  : businessMember,
                    numLikes        : this.numLikes,
                    selfMade        : !!this.selfMade,
                    tags            : tags,
                    isBeforeAfter   : _.some(tags, function (tag) {
                        return tag.name == "Avant-après";
                    }),
                    displayBusiness : business ? true : false,
                    hidden          : this.hidden,
                    customerEmail   : this.customerEmail,
                    createdAt       : this.createdAt,
                    updatedAt       : this.updatedAt
                });
            }.bind(this))
            .fail(function(error) {
                console.log("error", error)
            })
        }
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
                    objectID         : this.id,
                    price            : this.price,
                    numLikes         : numLikes,
                    businessId       : this.businessId,
                    businessMemberId : this.businessMemberId,
                    authorId         : this.authorId,
                    business         : business && {
                        name     : business.name,
                        address  : business.address,
                    },
                    _geoloc          : business && {
                        lat     : business.gps.lat,
                        lng     : business.gps.lng
                    },
                    _tags            : tags.map(function (t) { return t.name && t.name.fr; }),
                    categories       : categories.map(function (c) { return c.name; }),
                    lastLikeAt       : lastLike && lastLike.createdAt,
                    hidden           : this.hidden,
                    createdAt        : this.createdAt
                }
            }.bind(this));
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

    Hairfie.prototype.getOldTags = function() {
        return Q.ninvoke(Hairfie.app.models.Tag, 'findByIds', this.tags || []);
    }

    Hairfie.prototype.getTags = function () {
        var MemoryTag = Hairfie.app.models.MemoryTag;
        return MemoryTag.tagFromIds(this.tags || [])
            .then(function(tags) {
                return tags;
            })
    };

    Hairfie.prototype.getCategories = function () {
        return this.getTags().then(function (tags) {
            return Hairfie.app.models.Category.listForTagsAndGenders(tags);
        });
    };

    Hairfie.prototype.getBusinessMember = function() {
        if (this.businessMemberId) { 
            return Q.npost(this, 'businessMember');
        } else {
            return Q(null);
        }
    };

    Hairfie.prototype.getAuthor = function(context) {
        var User = Hairfie.app.models.User;
        return Q.ninvoke(User, 'findById', this.authorId);
    };

    Hairfie.delete = function (req, user, next) {
        if (!user) return next({statusCode: 401});
        var Engine = Hairfie.app.models.AlgoliaSearchEngine;

        return Promise.ninvoke(Hairfie, 'findById', req.params.hairfieId)
            .then(function(hairfie) {
                if (!hairfie) return next({statusCode: 404});
                var isAllowed = user.admin ? true : ((hairfie.authorId.toString() == req.user.id.toString()) || user.isManagerOfBusiness(hairfie.businessId));
                if (!isAllowed) return next({statusCode: 403});

                hairfie.hidden = true;

                return Promise.npost(hairfie, 'save');
            })
            .then(function(hairfie) {
                hairfie.deleteFromEngine();

                return;
            })
    };

    Hairfie.observe('after save', function (ctx, next) {
        var Business = Hairfie.app.models.Business;
        var BusinessMember = Hairfie.app.models.BusinessMember;
        var hairfie = ctx.instance;

        if (hairfie && ctx.instance.businessId) {
            Q.all([
                Q.ninvoke(Business, 'findOne', {where: {id: hairfie.businessId}}),
                hairfie.getTags(),
                getAveragePriceForTag(hairfie, 'Man'),
                getAveragePriceForTag(hairfie, 'Woman'),
                ctx.instance.businessMemberId ? Q.ninvoke(BusinessMember, 'findById', ctx.instance.businessMemberId) : null
            ]).spread(function (business, tags, menAveragePrice, womenAveragePrice, businessMember, author) {

                if (businessMember) {
                    Promise.npost(businessMember, 'count')
                        .then(function(bm) {
                            bm.numHairfies = count;
                            return q.ninvoke(bm, 'save');
                        });
                }

                if (business) {
                    business.hairfieTags = business.hairfieTags || {};
                    _.map(tags, function (tag) {
                        business.hairfieTags[tag.id] = (business.hairfieTags[tag.id] || 0) + 1;
                    });

                    Q.all([
                        Q.ninvoke(Hairfie, 'count', {businessId: hairfie.businessId}),
                        Hairfie.app.models.Category.listForTagsAndGenders(_.keys(business.hairfieTags), business.getGenders())
                    ])
                    .spread(function (numHairfies, hairfiesCategories) {

                        business.numHairfies = numHairfies;
                        business.hairfiesCategories = _.map(hairfiesCategories, 'id');
                        var averagePrice = {
                            men: menAveragePrice.amount,
                            women: womenAveragePrice.amount
                        }
                        business.averagePrice = averagePrice;

                        return Q.ninvoke(business, 'save');
                    })
                    .fail(function(error) {
                        console.log("business not updated ", error);
                    })
                }
            })
            .fail(function(error) {
                console.log("error", error);
            })
        }

        next();

    });

    Hairfie.observe('after save', function updateNumHairfies(ctx, next) {
        var hairfie = ctx.instance;
        if(hairfie) {
            Q.ninvoke(hairfie, 'author')
                .then(function(author) {
                    Q.ninvoke(Hairfie, 'count', {authorId: hairfie.authorId})
                        .then(function (numHairfies) {
                            author.numHairfies = numHairfies;
                            console.log("update author %s with %s hairfies", author.id, numHairfies)
                            Q.ninvoke(author, 'save');
                        })
                });
        }
        next();
    });

    Hairfie.observe('before save', function updateLikes(ctx, next) {
        var hairfie = ctx.instance;

        if(hairfie) {
            hairfie.getNumLikes()
                .then(function(numLikes) {
                    hairfie.numLikes = numLikes;
                    ctx.instance = hairfie;
                    next();
                })
                .fail(next)
        } else {
            next();
        }
    });

    Hairfie.observe('before save', function updateLikes(ctx, next) {
        var hairfie = ctx.instance;

        if(hairfie) {
            hairfie.getNumLikes()
                .then(function(numLikes) {
                    hairfie.numLikes = numLikes;
                    ctx.instance = hairfie;
                    next();
                })
                .fail(next)
        } else {
            next();
        }
    });

    Hairfie.updateHairfie = function (req, user, next) {
        if (!user) return next({statusCode: 401});
        var Engine = Hairfie.app.models.AlgoliaSearchEngine;
        return Promise.ninvoke(Hairfie, 'findById', req.params.hairfieId)
            .then(function(hairfie) {
                if (!hairfie) return next({statusCode: 404});
                var isAllowed = user.admin ? true : ((hairfie.authorId.toString() == req.user.id.toString()) || user.isManagerOfBusiness(hairfie.businessId));
                if (!isAllowed) return next({statusCode: 403});
                return Q.ninvoke(hairfie, 'updateAttributes', req.body.hairfie);
            })
            .then(function(hairfie) {
                return hairfie;
                next();
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
            {$match: {businessId: businessId, tags: tagId, hidden: false}},
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
        if (!ctx.req.accessToken) return next({statusCode: 401});

        ctx.req.body.authorId = ctx.req.accessToken.userId;

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
            Hairfie.findByIds(_.map(result, '_id'), function (error, hairfies) {
                if (error) deferred.reject(error);
                else deferred.resolve(hairfies);
            });
        });

        return deferred.promise;
    };

    Hairfie.listMostLikedForBusiness = function (businessId, limit) {
        var filter = {where: {"businessId": businessId}, order: 'createdAt DESC', limit: limit};

        return Q.ninvoke(Hairfie, 'find', filter);
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

        console.log("skip", req.query.skip);
        console.log("page", req.query.page);
        console.log("limit", req.query.limit);

        var limit = 10;
        var page = 1;

        if(req.query.skip) {
            page = Math.floor(req.query.skip/limit) + 1;
        } else if(req.query.page) {
            page = Math.max(req.query.page || 1);
        }

        if(req.query.limit) {
            limit = req.query.limit
        } else if(req.query.pageSize) {
            limit = req.query.pageSize;
        }

        params.page = page - 1;
        params.facets = ['categories', 'price.amount', '_tags'],
        params.hitsPerPage = Math.min(20, limit);
        params.facetFilters = ['hidden:false'];
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
        
        // filter by price
        if (req.query.priceMin) {
            params.numericFilters.push('price.amount >= '+req.query.priceMin);
        }
        if (req.query.priceMax) {
            params.numericFilters.push('price.amount <= '+req.query.priceMax);
        }

        if(req.query.businessId) {
            params.facetFilters.push('businessId:'+req.query.businessId);
        }

        if(req.query.businessMemberId) {
            params.facetFilters.push('businessMemberId:'+req.query.businessMemberId);
        }


        var Tag = Hairfie.app.models.Tag;
        var MemoryTag = Hairfie.app.models.MemoryTag;

        var AlgoliaSearchEngine = Hairfie.app.models.AlgoliaSearchEngine;

        return MemoryTag.filterFromTagNames(req.query.tags)
            .then(function(tagQuery) {
                if(tagQuery) {
                    params.tagFilters = tagQuery;
                }

                console.log("algolia params", params);

                return AlgoliaSearchEngine.search('hairfie', req.query.q || '', params);
            })
            .then(function (result) {
                if (req.isApiVersion('<1.2.2')) {
                    return [
                        result,
                        Q.ninvoke(Hairfie, 'findByIds', _.map(result.hits, 'objectID'))
                    ];
                } else {
                    return [result];
                }
            })
            .spread(function (result, hairfies) {
                if (req.isApiVersion('<1.2.2')) {
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
                } else {
                    return {
                        toRemoteObject: function () {
                            return {
                                hits        : _.map(_.map(result.hits, 'objectID'), function (id) {
                                    return Hairfie.findFromCache(id);
                                }),
                                numHits     : result.nbHits,
                                categories  : (result.facets || {}).categories || {},
                                tags        : (result.facets || {})._tags || {},
                                price       : (result.facets_stats || {})['price.amount']
                            };
                        }
                    };
                }
            });
    };

    Hairfie.similarHairfies = function(req, next) {
        if (_.isUndefined(req.query.q) && _.isUndefined(req.query.tags)) {
            return next();
        }
        var params = {};
        params.page = Math.max(1, req.query.page || 1) - 1;
        params.hitsPerPage = Math.max(1, Math.min(20, req.query.pageSize || 10));

        var forcedTags = ['Homme', 'Femme'];

        var OR = [];
        var AND = [];

        _.forEach(req.query.tags, function(tag) {
            if (_.isEmpty(_.intersection([tag], forcedTags)))
                OR.push(tag);
            else
                AND.push(tag);
        });

        if (req.query.tags) {
            if (OR.length > 0) {
                params.tagFilters = '(' + OR.join(', ') + ')' + (_.isEmpty(AND) ? '' : ', ') + AND.join(', ');
            }
            else {
                params.tagFilters = AND.join(', ');
            }
        }

        return Hairfie.app.models.AlgoliaSearchEngine
            .search('hairfie', req.query.q || '', params)
            .then(function (result) {
                return [
                    result,
                    Q.ninvoke(Hairfie, 'findByIds', _.map(result.hits, 'objectID'))
                ];
            })
            .spread(function (result, hairfies) {
                return {
                    toRemoteObject: function (context) {
                        return _.map(hairfies, function (hairfie) {
                            return hairfie.toRemoteObject(context);
                        });
                    }
                };
            });
        next();
    };

    Hairfie.prototype.toMailchimp = function () {
        return {
            email: {email: this.customerEmail}
        }
    }

    Hairfie.remoteMethod('share', {
        description: 'Shares a hairfie on social networks',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}}
        ],
        returns: {arg: 'result', root: true},
        http: { path: '/:hairfieId/share', verb: 'POST' }
    });

    Hairfie.remoteMethod('delete', {
        description: 'Delete the hairfie',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}},
            {arg: 'user', type: 'object', http: function (ctx) { return ctx.req.user; }}
        ],
        http: { path: '/:hairfieId', verb: 'DELETE' }
    });

    Hairfie.remoteMethod('updateHairfie', {
        description: 'Update the hairfie',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}},
            {arg: 'user', type: 'object', http: function (ctx) { return ctx.req.user; }}
        ],
        returns: {root: true},
        http: { path: '/:hairfieId', verb: 'PUT' }
    });

    Hairfie.remoteMethod('search', {
        description: 'Search hairfies',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}}
        ],
        returns: {root: true},
        http: {path: '/search', verb: 'GET'}
    });

    Hairfie.remoteMethod('similarHairfies', {
        description: 'Search Similar Hairfies',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}}
        ],
        returns: {root: true},
        http: {path: '/similar-hairfies', verb: 'GET'}
    });
};

function asArray(v) {
    if (_.isArray(v)) return v;
    if (_.isUndefined(v)) return [];
    return [v];
}
