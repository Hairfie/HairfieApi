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
};