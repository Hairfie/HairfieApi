'use strict';

module.exports = function (HairfieComment) {

    HairfieComment.validateAsync('hairfieId', function (onError, onDone) {
        this.hairfie(function (error, hairfie) {
            if (error || !hairfie) onError();
            onDone();
        });
    }, {message: 'exists'});
    HairfieComment.validateAsync('authorId', function (onError, onDone) {
        this.author(function (error, author) {
            if (error || !author) onError();
            onDone();
        });
    }, {message: 'exists'});

    // comments are associated to currently logged in user
    HairfieComment.beforeRemote('create', function (ctx, _, next) {
        ctx.req.body.authorId = ctx.req.accessToken.userId;
        next();
    });

};
