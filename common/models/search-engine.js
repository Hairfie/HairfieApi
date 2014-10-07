"use strict";

var elasticsearch = require('elasticsearch');
var Promise = require('../../common/utils/Promise');

module.exports = function (SearchEngine) {

    var client = null;

    function getSettings() {
        return SearchEngine.dataSource.settings;
    }

    function getIndex() {
        return getSettings().index;
    }

    function getClient() {
        if (!client) {
            var params = {};
            params.host = getSettings().host;
            params.port = getSettings().port;
            if (getSettings().user && getSettings().pass) {
                params.auth = {
                    username: getSettings().user,
                    password: getSettings().pass
                };
            }

            client = elasticsearch.Client(params);
        }

        return client;
    }

    SearchEngine.dropIndex = function () {
        var deferred = Promise.defer();

        var params = {};
        params.index = getIndex();

        getClient().indices.delete(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.createIndex = function () {
        var deferred = Promise.defer();

        var params = {};
        params.index = getIndex();

        getClient().indices.create(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.defineMapping = function (type, mapping) {
        var deferred = Promise.defer();

        var params = {};
        params.index = getIndex();
        params.type = type;
        params.body = mapping;

        getClient().indices.putMapping(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.index = function (type, id, data) {
        var deferred = Promise.defer();

        var params = {};
        params.index = getIndex();
        params.type = type;
        params.id = ''+id;
        params.body = data;

        getClient().index(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.delete = function (type, id) {
        var deferred = Promise.defer();

        var params = {};
        params.index = getIndex();
        params.type = type;
        params.id = ''+id;

        getClient().delete(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.search = function (type, body) {
        var deferred = Promise.defer();

        var params = {};
        params.index = getIndex();
        params.type = type;
        params.body = body;

        getClient().search(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.rebuildIndex = function () {
        console.log('Dropping search index');

        return SearchEngine
            .dropIndex()
            .then(function() {
                console.log('Creating search index');

                return SearchEngine.createIndex()
            })
            .then(function() {
                console.log('Defining search mappings');

                // @todo move mapping to model's settings
                return SearchEngine.defineMapping('business', {
                    business: {
                        properties: {
                            name: {
                                type: 'string'
                            },
                            gps: {
                                type: 'geo_point',
                                lat_lon: true,
                                geohash: true
                            }
                        }
                    }
                });
            })
            .then(function () {
                return Promise.denodeify(SearchEngine.getApp.bind(SearchEngine))();
            })
            .then(function (app) {
                console.log('Reindexing existing records');
                var Business = app.models.Business;

                var deferred = Promise.defer();

                var limit = 100;

                function loop(skip) {
                    console.log('Chunk:', skip);
                    Business.find({limit: limit, skip: skip}, function (error, businesses) {
                        Promise
                            .map(businesses, function (business) {
                                Promise.ninvoke(business, 'save');
                            })
                            .fail(function (error) {
                                deferred.reject(error);
                            })
                            .then(function () {
                                if (businesses.length < limit) {
                                    deferred.resolve(null);
                                } else {
                                    setTimeout(loop.bind(this, skip + limit), 1000);
                                }
                            });
                    });
                }

                loop(0);

                return deferred.promise;
            })
        ;
    }
}
