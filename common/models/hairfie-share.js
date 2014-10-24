'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (HairfieShare) {
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
        return Promise
            .map(networks, function (network) {
                return tryShareOnNetwork(user, hairfie, network);
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

    function tryShareOnNetwork(user, hairfie, network) {
        return shareOnNetwork(user, hairfie, network)
            .then(function (result) {
                return {
                    network: network,
                    externalId: result.externalId
                };
            })
            .catch(function (error) {
                console.log('Failed to share on', network, ':', error);
                return {network: network};
            })
        ;
    }

    function shareOnNetwork(user, hairfie, network) {
        switch (network) {
            case 'facebook':
                return shareOnFacebook(user, hairfie);
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
};
