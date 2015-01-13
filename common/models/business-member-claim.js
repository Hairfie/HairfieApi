'use strict';

var uid = require('uid2');
var Promise = require('../../common/utils/Promise');

module.exports = function (BusinessMemberClaim) {
    var ID_LENGTH = 64;

    BusinessMemberClaim.validateAsync('userId', function (onError, onDone) {
        this.user(function (error, user) {
            if (error || !user) onError();
            onDone();
        });
    }, {message: 'exists'});
    BusinessMemberClaim.validateAsync('businessId', function (onError, onDone) {
        this.business(function (error, business) {
            if (error || !business) onError();
            onDone();
        });
    }, {message: 'exists'});

    BusinessMemberClaim.beforeCreate = function (next) {
        uid(ID_LENGTH, function (error, id) {
            if (error) next(error);
            else {
                this.id = id;
                next();
            }
        }.bind(this));
    };

    BusinessMemberClaim.afterCreate = function (next) {
        var Email = BusinessMemberClaim.app.models.email,
            url   = BusinessMemberClaim.app.urlGenerator;

        Promise.all([
            Promise.ninvoke(this, 'business'),
            Promise.ninvoke(this, 'user')
        ]).spread(function (business, user) {
            Email.notifySales('Business member claim', {
                'Business ID'   : business.id,
                'Business Name' : business.name,
                'User ID'       : user.id,
                'User Name'     : user.getFullName(),
            }, {
                'Accept'        : url.acceptBusinessMemberClaim(this),
                'Refuse'        : url.refuseBusinessMemberClaim(this)
            }).fail(console.log);
        }.bind(this));

        next();
    };

    BusinessMemberClaim.beforeRemote('create', function (ctx, nil, next) {
        if (!ctx.req.user) return next({statusCode: 401});
        ctx.req.body.userId = ctx.req.user.id;
        next();
    });

    BusinessMemberClaim.accept = function (id, cb) {
        var BusinessMember = BusinessMemberClaim.app.models.BusinessMember;

        Promise
            .ninvoke(BusinessMemberClaim, 'findById', id)
            .then(function (claim) {
                if (!claim) throw {statusCode: 404};

                return [
                    claim,
                    Promise.ninvoke(claim, 'user')
                ];
            })
            .spread(function (claim, user) {
                if (!user) throw "User not found";

                BusinessMember.create({
                    businessId  : claim.id,
                    userId      : user.id,
                    firstName   : user.firstName,
                    lastName    : user.lastName,
                    hidden      : false,
                    active      : true
                }, cb);
            })
            .fail(cb);
    };

    BusinessMemberClaim.refuse = function (id, cb) {
        BusinessMemberClaim.deleteById(id, cb);
    };

    BusinessMemberClaim.remoteMethod('accept', {
        description: 'Accept the business member claim',
        accepts: [
            {arg: 'id', type: 'string', description: 'Identifier of the business member claim'}
        ],
        returns: {arg: 'BusinessMember', root: true},
        http: { verb: 'GET', path: '/:id/accept' }
    });

    BusinessMemberClaim.remoteMethod('refuse', {
        description: 'Refuse the business member claim',
        accepts: [
            {arg: 'id', type: 'string', description: 'Identifier of the business member claim'}
        ],
        returns: {arg: 'BusinessMember', root: true},
        http: { verb: 'GET', path: '/:id/refuse' }
    });
};
