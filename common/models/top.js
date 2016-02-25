'use strict';

var moment = require('moment');
var Promise = require('../../common/utils/Promise');

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

        Business.find({order: 'bestDiscount DESC', limit: limit, where: { topBusiness: true } }, function (error, businesses) {
            if (businesses.length < limit) {
                Business.find({order: 'bestDiscount DESC', limit: (limit - businesses.length), where: { topBusiness: { neq: true } } }, function (error, complete) {
                    cb(error, _.map(businesses.concat(complete), businessDeal));
                });
            } else {
                cb(error, _.map(businesses, businessDeal));
            }
        });
    };

    Top.businessReviews = function(limit) {
        var limit = Math.max(0, Math.min(20, limit || 10));
        var BusinessReview = Top.app.models.BusinessReview;

        var filters = { 
            limit: limit, 
            where: {
                rating: { gte: 70 }
            },
            order: 'createdAt DESC'
        };
        return Promise.ninvoke(BusinessReview, 'find', filters)
    }

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

    Top.remoteMethod('businessReviews', {
        description: 'Returns the top deals of the moment',
        accepts: [
            {arg: 'limit', type: 'number', description: 'Maximum number of deals to return (default 10)'}
        ],
        returns: {arg: 'Deal', root: true},
        http: { verb: 'GET', path: '/businessReviews' }
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
