'use strict';

var Promise = require('../../common/utils/Promise');
var _ = require('lodash');
var Hooks = require('./hooks');

module.exports = function (BusinessReview) {
    Hooks.generateId(BusinessReview);
    Hooks.updateTimestamps(BusinessReview);

    var criterionKeys = [
        'welcome',
        'treatment',
        'discussion',
        'decoration',
        'resultQuality',
        'hygiene',
        'availability'
    ];

    BusinessReview.prototype.toRemoteObject = function (context) {
        var criteria = this.criteria || {};

        return Promise.ninvoke(this, 'author')
            .then(function (author) {
                return {
                    id          : this.id,
                    href        : BusinessReview.app.urlGenerator.api('businessReview/'+this.id),
                    firstName   : author ? author.firstName : this.firstName,
                    lastName    : author ? author.lastName : this.lastName,
                    rating      : this.rating,
                    criteria    : this.criteria || {},
                    comment     : this.comment,
                    author      : author ? author.toRemoteShortObject() : null,
                    business    : Promise.ninvoke(this.business).then(function (business) {
                        return business ? business.toRemoteShortObject() : null;
                    }),
                    createdAt   : this.createdAt,
                    updatedAt   : this.updatedAt
                };
            }.bind(this));
    };

    BusinessReview.validateAsync('businessId', function (onError, onDone) {
        this.business(function (error, business) {
            if (error || !business) onError();
            onDone();
        });
    }, {message: 'exists'});

    BusinessReview.validate('criteria', function (onError) {
        _.forIn(this.criteria || {}, function (value, key) {
            if (-1 == criterionKeys.indexOf(key)) onError();
            if (!_.isNumber(value)) onError();
            if (value < 0 || value > 100) onError();
        });
    }, {message: 'valid'});

    BusinessReview.beforeValidate = function (next) {
        var sum = 0, count = 0;
        _.forIn(this.criteria || {}, function (value) {
            count++;
            sum += value;
        });

        // ok, we don't change rating valu eif there is no criteria cause it
        // may be an old fashioned review (bare rating)
        if (count > 0) this.rating = Math.ceil(sum / count);

        next();
    };

    BusinessReview.afterCreate = function (next) {
        console.log("BusinessReview has been created");
        var businessReview = this;
        Promise.npost(this, 'business')
            .then(function (business) {
                return BusinessReview.app.models.email.notifySales('Un avis a été déposé', {
                    'ID'              : businessReview.id,
                    'Salon'           : business.name,
                    'Nom'             : businessReview.firstName + ' ' + businessReview.lastName,
                    'Email'           : businessReview.email,
                    'Note globale'    : businessReview.rating,
                    'Commentaire'     : businessReview.comment
                });
            })
            .fail(console.log);

        // update review request with reviewId so we know it's used
        this.request(function (error, request) {
            if (request) {
                request.reviewId = this.id;
                request.save();
            }

            next();
        }.bind(this));
    };

    BusinessReview.beforeRemote('create', function (ctx, _, next) {
        if (!ctx.req.body.requestId) {
            if (!ctx.req.user) return next({statusCode: 401});

            // fill values with user's ones
            ctx.req.body.authorId = ctx.req.user.id;
            ctx.req.body.firstName = ctx.req.user.firstName;
            ctx.req.body.lastName = ctx.req.user.lastName;
            ctx.req.body.email = ctx.req.user.email;
            ctx.req.body.phoneNumber = ctx.req.user.phoneNumber;

            // only verified reviews can be associated to hairfies
            delete ctx.req.body.hairfieId;

            next();
        }

        var BusinessReviewRequest = BusinessReview.app.models.BusinessReviewRequest;

        BusinessReviewRequest.findById(ctx.req.body.requestId, function (error, request) {
            if (error) return next(error);
            if (!request) return next({statusCode: 400, message: 'Review request not found'});
            if (!request.canWrite()) return next({statusCode: 400, message: 'Cannnot write with this review request'});

            ctx.req.body.businessId = request.businessId;
            ctx.req.body.hairfieId = request.hairfieId;
            ctx.req.body.email = request.email;

            next();
        });
    });

    BusinessReview.getBusinessRating = function (businessId, callback) {
        var collection = BusinessReview.dataSource.connector.collection(BusinessReview.definition.name);

        var pipe = [
            {$match: {businessId: businessId}},
            {$group: {_id: null, numReviews: {$sum: 1}, rating: {$avg: "$rating"}}}
        ];

        collection.aggregate(pipe, function (error, result) {
            if (error) return callback(error);

            var rating = {
                numReviews: 0,
                rating:     null
            };

            if (1 === result.length) {
                rating.numReviews = result[0].numReviews;
                rating.rating     = result[0].rating;
            }

            callback(null, rating);
        });
    };
};
