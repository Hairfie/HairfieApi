'use strict';

module.exports = {
    isAuthenticated: isAuthenticated
};

function isAuthenticated(cb) {
    return function (ctx, model, next) {
        if (!ctx.req.user) next({statusCode: 401});
        else if (cb) cb(ctx, model, next);
        else next();
    };
}
