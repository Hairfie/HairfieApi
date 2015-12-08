'use strict';

var moment = require('moment');

var _ = require('lodash');

module.exports = function (Top) {

    Top.hairfies = function (limit, cb) {
        var limit = Math.max(0, Math.min(20, limit || 10));
        var Hairfie = Top.app.models.Hairfie;
        var lastMonth = moment().subtract(2, 'month').toDate();

        Hairfie
            .listMostLikedSince(lastMonth, limit)
            .then(cb.bind(null, null), cb);
    };

    Top.businessHairfies = function (businessId, limit, cb) {
        var limit = Math.max(0, Math.min(20, limit || 10));
        var Hairfie = Top.app.models.Hairfie;
        Hairfie
            .listMostLikedForBusiness(businessId, limit)
            .then(cb.bind(null, null), cb);
    };

    Top.deals = function (limit, cb) {
        var limit = Math.max(0, Math.min(20, limit || 10));
        var Business = Top.app.models.Business;

        Business.find({order: 'bestDiscount DESC', limit: limit}, function (error, businesses) {
            cb(error, _.map(businesses, businessDeal));
        });
    };

    Top.remoteMethod('hairfies', {
        description: 'Returns the top hairfies of the moment',
        accepts: [
            {arg: 'limit', type: 'number', description: 'Maximum number of hairfies to return (default 10)'}
        ],
        returns: {arg: 'Hairfie', root: true},
        http: { verb: 'GET', path: '/hairfies' }
    });

    Top.remoteMethod('businessHairfies', {
        description: 'Returns the top hairfies of a business',
        accepts: [
            {arg: 'businessId', type: 'string', description: 'ID of the reference business'},
            {arg: 'limit', type: 'number', description: 'Maximum number of hairfies to return (default 10)'}
        ],
        returns: {arg: 'Hairfie', root: true},
        http: { verb: 'GET', path: '/hairfies/:businessId' }
    });
            

    Top.remoteMethod('deals', {
        description: 'Returns the top deals of the moment',
        accepts: [
            {arg: 'limit', type: 'number', description: 'Maximum number of deals to return (default 10)'}
        ],
        returns: {arg: 'Deal', root: true},
        http: { verb: 'GET', path: '/deals' }
    });

};

function businessDeal(business) {
    return {
        toRemoteObject: function (context) {
            return {
                business: business.toRemoteShortObject(context),
                discount: business.bestDiscount
            }
        }
    };
}
