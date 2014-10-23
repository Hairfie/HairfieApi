'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (HairfieShare) {
    var networkCredentialProviders = {
        facebook: 'facebook-token-link',
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
        return requireCredential(user, network)
            .then(shareOnNetworkWithCredential.bind(null, hairfie, network))
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

    function shareOnNetworkWithCredential(hairfie, network, credential) {
        var deferred       = Promise.defer(),
            fbGraph        = HairfieShare.app.fbGraph,
            urlGenerator   = HairfieShare.app.urlGenerator,
            hairfieUrl     = urlGenerator.hairfie(hairfie);

        switch (network) {
            case 'facebook':
                fbGraph.post(credential.externalId+'/feed', {link: hairfieUrl}, function (error, result) {
                    if (error) return deferred.reject(error);
                    return deferred.resolve({externalId: result.id});
                });
                break;

            default:
                deferred.reject(new Error("Unsupported network: "+network));
        }

        return deferred.promise;
    }

    function requireCredential(user, network) {
        var deferred = Promise.defer(),
            provider = networkCredentialProviders[network];

        if (!provider) {
            return deferred.reject(new Error("Unsupported network"));
        }

        var criteria = {where: {userId: user.id, provider: provider}};

        HairfieShare.app.models.userCredential.findOne(criteria, function (error, credential) {
            if (error) return deferred.reject(error);
            if (!credential) return deferred.reject(new Error("No credential found"));
            deferred.resolve(credential);
        });

        return deferred.promise;
    }
};
