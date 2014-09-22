'use strict';

module.exports = function enableAuthentication(server) {
    // enable authentication
    server.enableAuth();

    server.remotes().before('**', function (ctx, next) {
        var needsCurrentUser = false;
        for (var i in ctx.method.accepts) {
            if (ctx.method.accepts[i].arg === 'currentUser') {
                needsCurrentUser = true;
                break;
            }
        }

        if (needsCurrentUser) {
            var accessToken = ctx.req.accessToken;

            if (accessToken && accessToken.userId) {
                accessToken.user(function (error, user) {
                    if (error) return next(error);
                    ctx.args.currentUser = user;
                    next();
                });
            }

            next({statusCode: 401});
        } else {
            next();
        }
    });
};
