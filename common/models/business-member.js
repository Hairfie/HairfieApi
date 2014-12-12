'use strict';

var Promise = require('../utils/Promise');
var RemoteObject = require('../utils/RemoteObject');
var validateExists = require('../utils/validator/exists');
var Control = require('../utils/AccessControl');

module.exports = function (BusinessMember) {
    BusinessMember.validateAsync('businessId', validateExists('business'), {message: 'exists'});
    BusinessMember.validateAsync('userId', validateExists('user'), {message: 'exists'});
    BusinessMember.validatesUniquenessOf('userId', {scopedTo: ['businessId']});

    BusinessMember.prototype.toRemoteObject = function (context) {
        return {
            id          : this.id,
            business    : RemoteObject.related(this, 'business', context),
            user        : RemoteObject.related(this, 'user', context),
            firstName   : this.firstName,
            lastName    : this.lastName,
            hidden      : this.hidden,
            active      : this.active
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

    BusinessMember.beforeRemote('create', Control.isAuthenticated(function (ctx, _, next) {
        ctx.req.user.isManagerOfBusiness(ctx.req.body.businessId)
            .then(function (isManager) {
                if (!isManager) return next({statusCode: 403});
                next();
            })
            .fail(next);
    }));

    BusinessMember.beforeRemote('*.updateAttributes', Control.isAuthenticated(function (ctx, _, next) {
        ctx.req.user.isManagerOfBusiness(ctx.instance.businessId)
            .then(function (isManager) {
                if (!isManager) return next({statusCode: 403});
                delete ctx.req.body.userId;
                delete ctx.req.body.businessId;
                next();
            })
            .fail(next);
    }));
};
