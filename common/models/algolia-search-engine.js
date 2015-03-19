"use strict";

var Algolia = require('algolia-search');
var Promise = require('../../common/utils/Promise');

module.exports = function (AlgoliaSearchEngine) {

    var client = null;

    function getSettings() {
        return AlgoliaSearchEngine.dataSource.settings;
    }

    function getIndex(type) {
        return getSettings().index[type];
    }

    function getClient() {
        if (!client) {
            client = new Algolia(getSettings().applicationId, getSettings().apiKey);
        }

        return client;
    }


    AlgoliaSearchEngine.displayInfos = function () {
        console.log("getSettings :", getSettings());
        return;
    };

    AlgoliaSearchEngine.dropIndex = function (type) {
        var deferred = Promise.defer();

        var index = getClient().initIndex(getIndex(type));
        index.clearIndex(deferred.makeNodeResolver());

        return deferred.promise;
    }


    AlgoliaSearchEngine.saveObject = function (type, data) {
        var deferred = Promise.defer();
        var index = getClient().initIndex(getIndex(type));
        index.saveObject(data, deferred.makeNodeResolver());

        return deferred.promise;
    }

    AlgoliaSearchEngine.delete = function (type, id) {
        var deferred = Promise.defer();
        var index = getClient().initIndex(getIndex(type));

        index.deleteObject(id, deferred.makeNodeResolver());

        return deferred.promise;
    }

    AlgoliaSearchEngine.search = function (type, query, params) {
        var deferred = Promise.defer();
        var index = getClient().initIndex(getIndex(type));
        index.search(query, deferred.makeNodeResolver(), params);

        return deferred.promise;
    }

    AlgoliaSearchEngine.defineSettings = function (type, settings) {
        var deferred = Promise.defer();

        var index = getClient().initIndex(getIndex(type));
        index.setSettings(settings, deferred.makeNodeResolver());

        return deferred.promise;
    }

    AlgoliaSearchEngine.defineAllSettings = function () {
        return AlgoliaSearchEngine.defineSettings('business', {
            attributesForFaceting: ['genders', 'categories', '_tags'],
            attributesToIndex: ['name','categories','address.city','_tags', 'address.streetName','address.zipCode'],
            customRanking: ['desc(numHairfies)', 'desc(rating)', 'desc(numReviews)']
        });
    };

    AlgoliaSearchEngine.indexAll = function (progressHandler) {
        var Business = AlgoliaSearchEngine.app.models.Business;
        var deferred = Promise.defer();
        var index = getClient().initIndex(getIndex('business'));
        var limit = 100;

        function loop(skip) {
            if (progressHandler) progressHandler({done: skip});

            Business.find({order: 'createdAt DESC', limit: limit, skip: skip}, function (error, businesses) {

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
