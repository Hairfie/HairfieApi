'use strict';

var Promise = require('../../common/utils/Promise');
var _ = require('lodash');
var Control = require('../utils/AccessControl');

module.exports = function (Hairdresser) {
    Hairdresser.validateAsync('businessId', function (onError, onDone) {
        this.business(function (error, business) {
            if (error || !business) onError();
            onDone();
        });
    }, {message: 'exists'});

    Hairdresser.prototype.toRemoteObject = function () {
        var Hairfie = Hairdresser.app.models.Hairfie;

        var obj = this.toRemoteShortObject();
        obj.business = Promise
            .npost(this, 'business')
            .then(function (business) {
                return business ? business.toRemoteShortObject() : null;
            })
        ;
        obj.numHairfies = Promise.ninvoke(Hairfie, 'count', {hairdresserId: this.id});
        obj.createdAt = this.createdAt;
        obj.updatedAt = this.updatedAt;

        return obj;
    };

    Hairdresser.prototype.toRemoteShortObject = function () {
        return {
            id          : this.id,
            firstName   : this.firstName,
            lastName    : this.lastName,
            email       : this.email,
            phoneNumber : this.phoneNumber,
            active      : this.active
        };
    };

    Hairdresser.beforeRemote('create', Control.isAuthenticated(function (ctx, _, next) {
        ctx.req.user.isManagerOfBusiness(ctx.args.data.businessId)
            .then(function (isManager) {
                if (!isManager) return next({statusCode: 403});
                next();
            })
            .fail(next);
    }));

    Hairdresser.beforeRemote('*.updateAttributes', Control.isAuthenticated(function (ctx, v, next) {
        ctx.req.user.isManagerOfBusiness(ctx.instance.businessId)
            .then(function (isManager) {
                if (!isManager) return next({statusCode: 403});

                delete ctx.req.body.businessId;
                next();
            })
            .fail(next);
    }));
};
