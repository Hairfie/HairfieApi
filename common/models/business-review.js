'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (BusinessReview) {
    BusinessReview.prototype.toRemoteObject = function () {
        var self = this;

        return Promise.spread(
            [
                Promise.ninvoke(self.user),
                Promise.ninvoke(self.business)
            ],
            function (user, business) {
                return {
                    id          : self.id,
                    rating      : self.rating,
                    comment     : self.comment,
                    user        : user ? user.toRemoteShortObject() : null,
                    business    : business ? business.toRemoteShortObject() : null,
                    createdAt   : self.createdAt,
                    updatedAt   : self.updatedAt
                }
            }
        );
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
