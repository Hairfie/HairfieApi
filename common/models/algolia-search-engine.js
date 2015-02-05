"use strict";

var Algolia = require('algolia-search');
var Promise = require('../../common/utils/Promise');

module.exports = function (AlgoliaSearchEngine) {

    var client = null;

    function getSettings() {
        return AlgoliaSearchEngine.dataSource.settings;
    }

    function getBusinessIndex() {
        return getSettings().index.business;
    }

    function getHairfieIndex() {
        return getSettings().index.hairfie;
    }

    function getClient() {
        if (!client) {
            console.log("applicationId", getSettings().applicationId);
            console.log("adminApiKey", getSettings().adminApiKey);
            client = new Algolia(getSettings().applicationId, getSettings().adminApiKey);
        }

        return client;
    }

    AlgoliaSearchEngine.configure = function () {
        var index = getClient().initIndex(getBusinessIndex());

        index.setSettings({'attributesForFaceting': ['address.city']});
    };

    AlgoliaSearchEngine.indexAll = function (progressHandler) {
        var Business = AlgoliaSearchEngine.app.models.Business;
        var deferred = Promise.defer();
        var index = getClient().initIndex(getBusinessIndex());
        var limit = 500;

        function loop(skip) {
            if (progressHandler) progressHandler({done: skip});

            Business.find({limit: limit, skip: skip}, function (error, businesses) {

                return Promise.map(businesses, function (business) {
                        return business.toAlgoliaSearchIndexObject();
                    })
                    .then(Promise.resolveDeep)
                    .then(function(body) {
                        index.saveObjects(body, function(error, content) {
                            if (error) {
                                console.error("ERROR: %s", content.message);
                                return deferred.reject(error);
                            }

                            if (businesses.length < limit) {
                                deferred.resolve(null);
                            } else {
                                loop(skip + limit);
                            }
                        });
                    });
            });
        }

        loop(0);

        return deferred.promise;
    };
}