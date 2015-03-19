'use strict';

module.exports = function (Model) {
    Model.defineProperty('createdAt', {type: Date});
    Model.defineProperty('updatedAt', {type: Date});

    Model.observe('before save', function updateTimestamps(ctx, next) {
        var now = new Date();
        if (ctx.instance) {
            if (ctx.instance.isNewRecord()) {
                ctx.instance.createdAt = now;
            }
            ctx.instance.updatedAt = now;
        } else {
            ctx.data.updatedAt = now;
        }

        next();
    });
};
