'use strict';

var uid = require('uid2');

var DEFAULT_LENGTH = 64;

module.exports = function (Model, options) {
    Model.observe('before save', function generateSecretId(ctx, next) {
        if (!ctx.instance || ctx.instance.id) return next();

        uid(options.length || DEFAULT_LENGTH, function (error, id) {
            if (error) next(error);
            else {
                ctx.instance.id = id;
                next();
            }
        });
    });
};
