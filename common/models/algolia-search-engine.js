"use strict";

var Algolia = require('algolia-search');
var Promise = require('../../common/utils/Promise');

module.exports = function (AlgoliaSearchEngine) {

    var client = null;

    function getSettings() {
        return AlgoliaSearchEngine.dataSource.settings;
    }

    function getIndex(type) {
        switch (type) {
            case 'business':
                return getSettings().index.business;
            case 'hairfie':
                return getSettings().index.hairfie;
            default:
                return getSettings().index.business;
        }
    }

    function getBusinessIndex() {
        return getSettings().index.business;
    }

    function getHairfieIndex() {
        return getSettings().index.hairfie;
    }

    function getClient() {
        if (!client) {
            client = new Algolia(getSettings().applicationId, getSettings().adminApiKey);
        }

        return client;
    }

    // Useless for the moment, to fix and clean
    AlgoliaSearchEngine.configure = function () {
        var index = getClient().initIndex(getBusinessIndex());

        index.setSettings({'attributesForFaceting': ['address.city']});
    };

    AlgoliaSearchEngine.saveObject = function (type, data) {
        var deferred = Promise.defer();
        if(type == 'business') {
            var index = getClient().initIndex(getBusinessIndex());
        }
        index.saveObject(data, deferred.makeNodeResolver());

        return deferred.promise;
    }

    AlgoliaSearchEngine.delete = function (type, id) {
        var deferred = Promise.defer();
        if(type == 'business') {
            var index = getClient().initIndex(getBusinessIndex());
        }
        index.deleteObject(id, deferred.makeNodeResolver());

        return deferred.promise;
    }

    AlgoliaSearchEngine.search = function (type, body) {
        var deferred = Promise.defer();

        var params = {};
        params.index = getIndex();
        params.type = type;
        params.body = body;

        getClient().search(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    AlgoliaSearchEngine.indexAll = function (progressHandler) {
        var Business = AlgoliaSearchEngine.app.models.Business;
        var deferred = Promise.defer();
        var index = getClient().initIndex(getBusinessIndex());
        var limit = 100;

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