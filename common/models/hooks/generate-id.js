'use strict';

var UUID = require('uuid');

module.exports = function (Model) {
    Model.observe('before save', function generateId(ctx, next) {
        if (ctx.instance) ctx.instance.id = ctx.instance.id || UUID.v4();
        next();
    });
};
