'use strict';

var Promise = require('../../common/utils/Promise');
var _ = require('lodash');

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

    Hairdresser.beforeRemote('create', function (ctx, v, next) {
        // user must be logged in
        if (!ctx.req.accessToken) {
            return next({statusCode: 401});
        }

        // user must be the business's owner
        var Business = Hairdresser.app.models.Business;

        // TODO: should be in vaidation
        Business.findById(ctx.args.data.businessId, function (error, business) {
            if (error) next(error);
            if (!business) next({statusCode: 500, message: 'Could not load hairdresser\'s business'});

            // only the business's owner can update a hairdresser
            if (!_.contains(business.managerIds, ctx.req.accessToken.userId.toString())) {
                return next({statusCode: 403, message: 'You must be the business\' owner'});
            }

            next();
        });
    });

    Hairdresser.beforeRemote('*.updateAttributes', function (ctx, v, next) {
        // user must be logged in
        if (!ctx.req.accessToken) {
            return next({statusCode: 401});
        }

        ctx.instance.business(function (error, business) {
            if (error) next(error);
            if (!business) next({statusCode: 500, message: 'Could not load hairdresser\'s business'});

            // only the business's owner can update a hairdresser
            if (!_.contains(business.managerIds, ctx.req.accessToken.userId.toString())) {
                return next({statusCode: 403});
            }

            // prevent owner change
            delete ctx.req.body.businessId;

            next();
        });
    });
};
