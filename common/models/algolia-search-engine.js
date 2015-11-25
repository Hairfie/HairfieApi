"use strict";

var algoliasearch = require('algoliasearch');
var Q = require('q');
var _ = require('lodash');

module.exports = function (AlgoliaSearchEngine) {
    AlgoliaSearchEngine.indexes = {};

    var client = null;
    var indices = {};

    function settings() {
        return AlgoliaSearchEngine.dataSource.settings;
    }

    function indexModel(indexName) {
        return settings().indices[indexName].model;
    }

    function indexSettings(indexName) {
        return settings().indices[indexName].settings;
    }

    function indexByName(indexName) {
        return getClient().initIndex(settings().indices[indexName].index);
    }

    function modelSearchDocument(model) {
        return model.toSearchDocument();
    }

    function getClient() {
        if (!client) {
            client = algoliasearch(settings().applicationId, settings().apiKey);
        }

        return client;
    }

    function runAlgolia(desc, action) {
        var deferred = Q.defer();

        action(function (error, content) {
            if (error) {
                if (content && content.message)
                    deferred.reject('Failed to '+desc+': '+content.message);
            }
            else deferred.resolve(content);
        });

        return deferred.promise;
    }

    AlgoliaSearchEngine.dropIndex = function (indexName) {
        return runAlgolia('drop index', function (resolver) {
            indexByName(indexName).clearIndex(resolver);
        });
    };

    AlgoliaSearchEngine.saveDocument = function (indexName, body) {
        return runAlgolia('save document', function (resolver) {
            indexByName(indexName).saveObject(body, resolver);
        });
    };

    AlgoliaSearchEngine.deleteDocument = function (indexName, id) {
        return runAlgolia('delete document', function (resolver) {
            indexByName(indexName).deleteObject(id, resolver);
        });
    };

    AlgoliaSearchEngine.search = function (indexName, query, params) {
        return runAlgolia('search', function (resolver) {
            indexByName(indexName).search(query, params, resolver);
        });
    };

    AlgoliaSearchEngine.configureIndex = function (indexName) {
        return runAlgolia('configure index', function (resolver) {
            indexByName(indexName).setSettings(indexSettings(indexName), resolver);
        });
    };

    AlgoliaSearchEngine.indexAll = function (indexName, onProgress) {
        var Model = AlgoliaSearchEngine.app.models[indexModel(indexName)];
        var onProgress = onProgress || _.noop;
        var chunkSize = 100;
        var index = indexByName(indexName);

        return Q.ninvoke(Model, 'count')
            .then(function (total) {
                var loop = function (skip) {
                    onProgress({total: total, done: skip});

                    return Q.ninvoke(Model, 'find', {limit: chunkSize, skip: skip, order: 'updatedAt DESC'})
                        .then(function (models) {
                            return Q.all(_.map(models, modelSearchDocument))
                                .then(function (docs) {
                                    return runAlgolia('save documents', function (resolver) {
                                        index.saveObjects(docs, resolver);
                                    });
                                })
                                .then(function () {
                                    return models.length < chunkSize ? null : loop(skip + chunkSize);
                                });
                        });
                };

                return loop(0);
            });
    };
}
