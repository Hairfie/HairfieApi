'use strict';

module.exports = function (BusinessClaim) {
    BusinessClaim.beforeRemote('**', function (ctx, _, next) {
        console.log(ctx.args);
        next();
    });

    // business claims are associated to currently logged in user
    BusinessClaim.beforeRemote('create', function (ctx, _, next) {
        ctx.req.body.authorId = ctx.req.accessToken.userId;
        next();
    });
}
