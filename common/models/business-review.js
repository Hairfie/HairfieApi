'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (BusinessReview) {
    BusinessReview.prototype.toRemoteObject = function () {
        return {
            id          : this.id,
            rating      : this.rating,
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

    // @todo isn't there a way to automate this validation?
    BusinessReview.validateAsync('businessId', function (onError, onDone) {
        this.business(function (error, business) {
            if (error || !business) onError();
            onDone();
        });
    }, {message: 'exists'});

    // reviews are associated to currently logged in user
    BusinessReview.beforeRemote('create', function (ctx, _, next) {
        ctx.req.body.authorId = ctx.req.accessToken.userId;
        next();
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
