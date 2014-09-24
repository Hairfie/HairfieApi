'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (BusinessClaim) {

    BusinessClaim.beforeRemote('**', function (ctx, _, next) {
        console.log(ctx.args);
        next();
    });

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

            console.log('toto');
            var business = new Business();
            console.log('tata');
            business.name = businessClaim.name;
            business.phone_numbers = [businessClaim.phoneNumber];
            if (businessClaim.address) {
                business.street = businessClaim.address.street;
                business.city = businessClaim.address.city;
                business.zipcode = businessClaim.address.zipCode;
                business.country = businessClaim.address.country;
            }
            business.gps = businessClaim.gps;
            business.pictures = businessClaim.pictures;
            business.services = businessClaim.services;

            // TODO: complete with declaration of Hairdressers

            business.save(function (error, business) {
                console.log('tutu');
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
}
