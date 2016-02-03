'use strict';

var Q = require('q');
var _ = require('lodash');

module.exports = function (Business) {
    Business.prototype.getFacebookPageObject = function () {
        var User = Business.app.models.user;

        var facebookPage = this.facebookPage || {};

        return {
            toRemoteObject: function (context) {
                return {
                    name        : facebookPage.name,
                    user        : Q.ninvoke(User, 'findById', facebookPage.userId).then(function (user) {
                        return user && user.toRemoteShortObject(context);
                    }),
                    createdAt   : facebookPage.createdAt
                };
            },
            toRemoteShortObject: function (context) {
                return {
                    name        : facebookPage.name
                };
            }
        };
    };


    Business.getFacebookPage = function (businessId, user, cb) {
        if (!user) return cb({statusCode: 401});

        user.isManagerOfBusiness(businessId)
            .then(function (isManager) {
                if (!isManager) return cb({statusCode: 403});

                return Q.ninvoke(Business, 'findById', businessId);
            })
            .then(function (business) {
                if (!business || !business.facebookPage) return cb({statusCode: 404});

                cb(null, business.getFacebookPageObject(context));
            })
            .fail(cb);
    };

    Business.saveFacebookPage = function (businessId, data, user, cb) {
        if (!user) return cb({statusCode: 401});

        user.isManagerOfBusiness(businessId)
            .then(function (isManager) {
                if (!isManager) return cb({statusCode: 403});

                return Q.ninvoke(Business, 'findById', businessId);
            })
            .then(function (business) {
                if (!business) return cb({statusCode: 404});

                var fb = Business.app.fbGraph;

                fb.get(data.id+'?access_token='+data.access_token, function (error, response) {
                    if (error) return cb({statusCode: 500});
                    if (!response.can_post) return cb({statusCode: 400, message: 'Cannot post'});

                    var facebookPage = business.facebookPage || {};
                    facebookPage.userId = user.id;
                    facebookPage.facebookId = data.id;
                    facebookPage.name = response.name;
                    facebookPage.accessToken = data.access_token;
                    facebookPage.graphData = response;
                    facebookPage.createdAt = facebookPage.createdAt || new Date();
                    facebookPage.updatedAt = new Date();

                    business.facebookPage = facebookPage;

                    business.save({}, function (error) {
                        if (error) return cb({statusCode: 500});
                        cb(null, business.getFacebookPageObject(context));
                    });
                });
            })
            .fail(cb);
    };
    Business.deleteFacebookPage = function (businessId, user, cb) {
        if (!user) return cb({statusCode: 401});

        user.isManagerOfBusiness(businessId)
            .then(function (isManager) {
                if (!isManager) return cb({statusCode: 403});

                return Q.ninvoke(Business, 'findById', businessId);
            })
            .then(function (business) {
                if (!business) return cb({statusCode: 404});

                business.facebookPage = null;
                return Q.ninvoke(business, 'save');
            })
            .then(cb.bind(null, null), cb);
    };

    Business.remoteMethod('getFacebookPage', {
        description: 'Returns the facebook page of the business',
        accepts: [
            {arg: 'businessId', type: 'string', description: 'Identifier of the business'},
            {arg: 'user', type: 'object', http: function (ctx) { return ctx.req.user; }}
        ],
        returns: {arg: 'facebookPage', root: true},
        http: {verb: 'GET', path: '/:businessId/facebook-page'}
    });

    Business.remoteMethod('saveFacebookPage', {
        description: 'Saves the facebook page of the business',
        accepts: [
            {arg: 'businessId', type: 'string', description: 'Identifier of the business'},
            {arg: 'data', type: 'object', http: {source: 'body'}},
            {arg: 'user', type: 'object', http: function (ctx) { return ctx.req.user; }}
        ],
        returns: {arg: 'facebookPage', root: true},
        http: {verb: 'PUT', path: '/:businessId/facebook-page'}
    });

    Business.remoteMethod('deleteFacebookPage', {
        description: 'Deletes the facebook page of the business',
        accepts: [
            {arg: 'businessId', type: 'string', description: 'Identifier of the business'},
            {arg: 'user', type: 'object', http: function (ctx) { return ctx.req.user; }}
        ],
        http: {verb: 'DELETE', path: '/:businessId/facebook-page'}
    });

};