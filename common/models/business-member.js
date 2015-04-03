'use strict';

var Promise = require('../utils/Promise');
var RemoteObject = require('../utils/RemoteObject');
var validateExists = require('../utils/validator/exists');
var Control = require('../utils/AccessControl');
var Hooks = require('./hooks');

module.exports = function (BusinessMember) {
    Hooks.generateId(BusinessMember);
    Hooks.updateTimestamps(BusinessMember);
    Hooks.hasImages(BusinessMember, {
        picture: {
            container: 'business-members'
        }
    });

    BusinessMember.GENDER_MALE = 'MALE';
    BusinessMember.GENDER_FEMALE = 'FEMALE';

    // TODO: validation generates timeouts now...
    //BusinessMember.validateAsync('businessId', validateExists('business'), {message: 'exists'});
    //BusinessMember.validateAsync('userId', validateExists('user'), {message: 'exists'});
    BusinessMember.validatesUniquenessOf('userId', {scopedTo: ['businessId']});
    //BusinessMember.validatesInclusionOf('gender', {in: [BusinessMember.GENDER_MALE, BusinessMember.GENDER_FEMALE]});

    BusinessMember.prototype.toRemoteObject = function (context) {
        var obj = this.toRemoteShortObject(context);
        obj.business = RemoteObject.related(this, 'business', context);

        return obj;
    };

    BusinessMember.prototype.toRemoteShortObject = function (context) {
        return {
            id          : this.id,
            href        : BusinessMember.app.urlGenerator.api('businessMembers/'+this.id),
            gender      : this.gender,
            firstName   : this.firstName,
            lastName    : this.lastName,
            email       : this.email,
            phoneNumber : this.phoneNumber,
            picture     : this.picture && this.picture.toRemoteShortObject(context),
            hidden      : this.hidden,
            user        : RemoteObject.related(this, 'user', context),
            active      : this.active,
            numHairfies : Promise.npost(this, 'getNumHairfies')
        };
    };

    BusinessMember.prototype.getNumHairfies = function (cb) {
        if (!this.id) cb(null, 0);
        var Hairfie = BusinessMember.app.models.Hairfie;
        Hairfie.count({businessMemberId: this.id}, cb);
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
                //delete ctx.req.body.userId;
                delete ctx.req.body.businessId;
                next();
            })
            .fail(next);
    }));
};
