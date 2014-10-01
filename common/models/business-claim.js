'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (BusinessClaim) {

    BusinessClaim.prototype.toRemoteObject = function () {
        var obj = this.toObject();
        obj.pictures = BusinessClaim.getPictureObjects(this);

        return obj;
    };

    // business claims are associated to currently logged in user
    BusinessClaim.beforeRemote('create', function (ctx, _, next) {
        ctx.req.body.authorId = ctx.req.accessToken.userId;
        next();
    });

    BusinessClaim.submit = function (businessClaimId, callback) {
        var Business = BusinessClaim.app.models.Business;

        BusinessClaim.findById(businessClaimId, function (error, businessClaim) {
            if (error) return callback(error);
            if (!businessClaim) return callback({statusCode: 404});

            var business = new Business();
            business.name = businessClaim.name;
            business.kind = businessClaim.kind;
            business.ownerId = businessClaim.authorId;
            business.phoneNumber = businessClaim.phoneNumber;
            business.address = businessClaim.address;
            business.gps = businessClaim.gps;
            business.pictures = businessClaim.pictures;
            business.services = businessClaim.services;
            business.hairdressers = businessClaim.hairdressers;
            business.men = businessClaim.men;
            business.women = businessClaim.women;
            business.children = businessClaim.children;

            business.save(function (error, business) {
                if (error) return callback(error);

                businessClaim.businessId = business.id;
                businessClaim.save(function (error, _) {
                    if (error) return callback(error);

                    callback(null, business);
                });
            });
        });
    };

    BusinessClaim.remoteMethod('submit', {
        description: 'Submit the business claim',
        accepts: [
            {arg: 'businessClaimId', type: 'ObjectId', description: 'Identifier of the business claim'}
        ],
        returns: {arg: 'Business', root: true},
        http: { verb: 'GET', path: '/:businessClaimId/submit' }
    });

    BusinessClaim.getPictureObjects = function (businessClaim) {
        if (!Array.isArray(businessClaim.pictures)) return [];

        return businessClaim.pictures.map(function (picture) {
            return (new Picture(picture, 'business-pictures', BusinessClaim.app.get('url'))).publicObject();
        });
    };
}
