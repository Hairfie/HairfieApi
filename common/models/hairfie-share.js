'use strict';

var Promise = require('../../common/utils/Promise');

var UUID = require('uuid');

module.exports = function (HairfieShare) {
    HairfieShare.beforeCreate = function (next) {
        this.id = this.id || UUID.v4();
        next();
    };

    HairfieShare.validateAsync('authorId', function (onError, onDone) {
        this.author(function (error, user) {
            if (error || !user) onError();
            onDone();
        });
    }, {message: 'exists'});
    HairfieShare.validateAsync('hairfieId', function (onError, onDone) {
        this.hairfie(function (error, hairfie) {
            if (error || !hairfie) onError();
            onDone();
        });
    }, {message: 'exists'});

    HairfieShare.share = function (user, hairfie, networks) {

        return Promise.ninvoke(hairfie, 'business')
            .then(function (business) {
                return Promise.map(networks, function (network) {
                    return tryShareOnNetwork(user, hairfie, business, network);
                })
            })
            .then(function (results) {
                var report = {};

                results.map(function (result) {
                    if (result.externalId) {
                        report[result.network] = {success: true};

                        HairfieShare.create({
                            hairfieId   : hairfie.id,
                            authorId    : user.id,
                            network     : result.network,
                            externalId  : result.externalId
                        });
                    } else {
                        report[result.network] = {success: false};
                    }
                });

                return report;
            })
        ;
    };

    function tryShareOnNetwork(user, hairfie, business, network) {
        return shareOnNetwork(user, hairfie, business, network)
            .then(function (result) {
                return {
                    network     : network,
                    externalId  : result.externalId
                };
            })
            .catch(function (error) {
                var Email = HairfieShare.app.models.email;
                Email.notifyTech('Failed to share hairfie on '+network, {
                    'Error'         : error,
                    'User ID'       : user.id,
                    'User name'     : user.firstName+' '+user.lastName,
                    'Business ID'   : business.id,
                    'Business name' : business.name,
                    'Hairfie ID'    : hairfie.id,
                });

                return {network: network};
            })
        ;
    }

    function shareOnNetwork(user, hairfie, business, network) {
        switch (network) {
            case 'facebook':
                return shareOnFacebook(user, hairfie);
                break;

            case 'facebookPage':
                return shareOnFacebookPage(user, hairfie, business);
                break;

            default:
                return Promise.reject('Unsupported network: '+network);
        }
    }

    function shareOnFacebook(user, hairfie) {
        if (!user.facebookId) return Promise.reject('User has no Facebook ID');

        var app          = HairfieShare.app,
            fbGraph      = app.fbGraph,
            urlGenerator = app.urlGenerator,
            requestPath  = user.facebookId+'/feed',
            requestBody  = {link: urlGenerator.hairfie(hairfie)};

        return Promise.npost(fbGraph, 'post', [requestPath, requestBody])
            .then(function (result) { return {externalId: result.id}; });
    }

    function shareOnFacebookPage(user, hairfie, business) {
        if (!business.facebookPage) return Promise.reject('Business has no facebook page');

        var app          = HairfieShare.app,
            fbGraph      = app.fbGraph,
            urlGenerator = app.urlGenerator,
            facebookPage = business.facebookPage,
            requestPath  = facebookPage.facebookId+'/feed?access_token='+facebookPage.accessToken,
            requestBody  = {link: urlGenerator.hairfie(hairfie)};

        return Promise.ninvoke(fbGraph, 'post', requestPath, requestBody)
            .then(function (result) { return {externalId: result.id}; });
    }
};
