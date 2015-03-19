'use strict';

var Promise = require('../../common/utils/Promise');
var Hooks = require('./hooks');

module.exports = function (ContentIssue) {
    Hooks.generateId(ContentIssue);
    Hooks.updateTimestamps(ContentIssue);

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
