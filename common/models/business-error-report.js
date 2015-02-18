'use strict';

var Promise = require('../../common/utils/Promise');
var UUID = require('uuid');

module.exports = function (BusinessErrorReport) {
    BusinessErrorReport.beforeCreate = function (next) {
        this.id = this.id || UUID.v4();
        next();
    };

    BusinessErrorReport.prototype.toRemoteObject = function () {
        return {
            id          : this.id,
            href        : BusinessErrorReport.app.urlGenerator.api('businessErrorReports/'+this.id),
            author      : Promise.ninvoke(this.author).then(function (author) {
                return author ? author.toRemoteShortObject() : null;
            }),
            business    : Promise.ninvoke(this.business).then(function (business) {
                return business ? business.toRemoteShortObject() : null;
            }),
            body        : this.body,
            createdAt   : this.createdAt,
            updatedAt   : this.updatedAt
        };
    };

    BusinessErrorReport.validateAsync('authorId', function (onError, onDone) {
        if (!this.authorId) return onDone(); // author is optional
        this.author(function (error, business) {
            if (error || !business) onError();
            onDone();
        });
    }, {message: 'exists'});

    BusinessErrorReport.validateAsync('businessId', function (onError, onDone) {
        this.business(function (error, business) {
            if (error || !business) onError();
            onDone();
        });
    }, {message: 'exists'});

    BusinessErrorReport.beforeRemote('create', function (ctx, _, next) {
        ctx.req.body.authorId = ctx.req.accessToken ? ctx.req.accessToken.userId : undefined;
        next();
    });
};
