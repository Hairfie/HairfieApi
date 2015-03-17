'use strict';

var Promise = require('../../common/utils/Promise');

var UUID = require('uuid');

module.exports = function (ContentIssue) {
    ContentIssue.observe('before save', function generateId(ctx, next) {
        if (ctx.instance) ctx.instance.id = ctx.instance.id || UUID.v4();
        next();
    });

    ContentIssue.toRemoteObject = function (context) {
        return {
            id      : this.id,
            href    : ContentIssue.app.urlGenerator.api('contentIssues/'+this.id),
            author  : Promise.ninvoke(this.author).then(function (author) {
                return author && author.toRemoteShortObject(context);
            }),
            title   : this.title,
            body    : this.body
        };
    };

    ContentIssue.beforeRemote('create', function (ctx, item, next) {
        ctx.req.body.authorId = ctx.req.user && ctx.req.user.id;
        next();
    });
};
