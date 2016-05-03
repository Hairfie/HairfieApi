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

            if()

            client = elasticsearch.Client(params);
            var es = elasticsearch.Client({
                hosts: getSettings().host,
                connectionClass: require('http-aws-es'),
                amazonES: {
                    region: 'eu-west-1',
                    accessKey: getSettings().awsKeyId,
                    secretKey: getSettings().awsSecret
                }
            });
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

    SearchEngine.defineAllMappings = function () {
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
    };

    SearchEngine.indexAll = function (progressHandler) {
        var Business = SearchEngine.app.models.Business;
        var deferred = Promise.defer();
        var limit = 100;

        function loop(skip) {
            if (progressHandler) progressHandler({done: skip});

            Business.find({limit: limit, skip: skip}, function (error, businesses) {
                var body = [];
                businesses.map(function (business) {
                    body.push({index: {_index:getIndex(), _type:'business', _id:business.id.toString()}});
                    body.push(business.toSearchIndexObject());
                });

                getClient().bulk({body:body}, function (error) {
                    if (error) return deferred.reject(error);

                    if (businesses.length < limit) {
                        deferred.resolve(null);
                    } else {
                        loop(skip + limit);
                    }
                });
            });
        }

        loop(0);

        return deferred.promise;
    };
}