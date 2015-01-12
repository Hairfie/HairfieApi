'use strict';

var Promise = require('../../common/utils/Promise');
var _ = require('lodash');

module.exports = function (BusinessReview) {
    var criterionKeys = [
        'welcome',
        'treatment',
        'discussion',
        'decoration',
        'resultQuality',
        'hygiene',
        'availability'
    ];

    BusinessReview.prototype.toRemoteObject = function () {
        var criteria = this.criteria || {};

        return {
            id          : this.id,
            rating      : this.rating,
            criteria    : this.criteria || {},
            comment     : this.comment,
            author      : Promise.ninvoke(this.author).then(function (author) {
                return author ? author.toRemoteShortObject() : null;
            }),
            business    : Promise.ninvoke(this.business).then(function (business) {
                return business ? business.toRemoteShortObject() : null;
            }),
            createdAt   : this.createdAt,
            updatedAt   : this.updatedAt
        };
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
        // update token with reviewId so we know it's used
        this.request(function (error, request) {
            if (token) {
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
            if (!token) return next({statusCode: 400, message: 'Token not found'});
            if (!token.canWrite()) return next({statusCode: 400, message: 'Cannnot write with this review request'});

            ctx.req.body.businessId = request.businessId;
            ctx.req.body.hairfieId = request.hairfieId;
            ctx.req.body.email = request.email;

            next();
        });
    });

    BusinessReview.getBusinessRating = function (businessId, callback) {
        var ObjectID   = BusinessReview.dataSource.ObjectID,
            collection = BusinessReview.dataSource.connector.collection(BusinessReview.definition.name);

        var pipe = [
            {$match: {businessId: ObjectID(businessId)}},
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
