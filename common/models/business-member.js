'use strict';

var Promise = require('../utils/Promise');
var RemoteObject = require('../utils/RemoteObject');
var validateExists = require('../utils/validator/exists');

module.exports = function (BusinessMember) {
    BusinessMember.validateAsync('businessId', validateExists('business'), {message: 'exists'});
    BusinessMember.validateAsync('userId', validateExists('user'), {message: 'exists'});
    BusinessMember.validatesUniquenessOf('userId', {scopedTo: 'businessId'});

    BusinessMember.prototype.toRemoteObject = function (context) {
        return {
            id      : this.id,
            business: RemoteObject.related(this, 'business', context),
            user    : RemoteObject.related(this, 'user', context),
            hidden  : this.hidden,
            active  : this.active
        };
    };

    BusinessMember.afterCreate = function (next) {
        var Email = BusinessMember.app.models.email;

        Promise
            .all([
                Promise.npost(this, 'business'),
                Promise.npost(this, 'user')
            ])
            .spread(function (business, user) {
                return Email.welcomeBusinessMember(business, user);
            })
            .then(next.bind(null, null), next);
    };

    BusinessMember.beforeRemote('create', isAuthenticated(function (ctx, _, next) {
        userCanManageBusiness(ctx.req.user, ctx.args.data.businessId, next);
    }));

    BusinessMember.beforeRemote('*.updateAttributes', isAuthenticated(function (ctx, _, next) {
        delete ctx.req.body.userId;
        delete ctx.req.body.businessId;

        userCanManageBusiness(ctx.req.user, ctx.instance.businessId, next);
    }));

    function isAuthenticated(cb) {
        return function (ctx, model, next) {
            if (!ctx.user) next({statusCode: 401});
            else if (cb) cb(ctx, model, next);
            else next();
        };
    }

    function userCanManageBusiness(user, businessId, next) {
        var  where = {};
        where.active = true;
        where.businessId = businessId;
        where.userId = user.id;

        BusinessMember.findOne({where: where}, function (error, bm) {
            if (error) next({statusCode: 500});
            else if (!bm) next({statusCode: 403});
            else next();
        });
    }
};
