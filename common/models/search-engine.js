"use strict";

var elasticsearch = require('elasticsearch');
var Q = require('q');

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
            client = elasticsearch.Client({
                host: getSettings().host
            });
        }

        return client;
    }

    SearchEngine.dropIndex = function () {
        var deferred = Q.defer();

        var params = {};
        params.index = getIndex();

        getClient().indices.delete(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.createIndex = function () {
        var deferred = Q.defer();

        var params = {};
        params.index = getIndex();

        getClient().indices.create(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.defineMapping = function (type, mapping) {
        var deferred = Q.defer();

        var params = {};
        params.index = getIndex();
        params.type = type;
        params.body = mapping;

        getClient().indices.putMapping(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.index = function (type, id, data) {
        var deferred = Q.defer();

        var params = {};
        params.index = getIndex();;
        params.type = type;
        params.id = ''+id;
        params.body = data;

        getClient().index(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.delete = function (type, id) {
        var deferred = Q.defer();

        var params = {};
        params.index = getIndex();;
        params.type = type;
        params.id = ''+id;

        getClient().delete(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.search = function (type, body) {
        var deferred = Q.defer();

        var params = {};
        params.index = getIndex();;
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
                return Q.denodeify(SearchEngine.getApp.bind(SearchEngine))();
            })
            .then(function (app) {
                console.log('Loading existing records');

                var Business = app.models.Business;

                return Q.denodeify(Business.find.bind(Business, {}))();
            })
            .then(function (businesses) {
                console.log('Reindexing existing records');
                return Q.all(businesses.map(function (business) {
                    // @todo move search doc creation to model's settings
                    return SearchEngine.index('business', business.id, {
                        name: business.name,
                        gps: {
                            lat: business.gps.lat,
                            lon: business.gps.lng
                        }
                    });
                }));
            })
        ;
    }
}
