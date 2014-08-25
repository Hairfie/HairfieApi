"use strict";

var elasticsearch = require('elasticsearch');
var Q = require('q');

module.exports = function (SearchEngine) {
    var index = 'hairfie-dev'; // @todo take it from configuration

    var client = elasticsearch.Client({
        host: 'dev.hairfie.com:9200',
    });

    SearchEngine.client = client;

    SearchEngine.clear = function (collection) {
        var deferred = Q.defer();

        var params = {};
        params.index = index;
        params.type = collection;

        client.indices.deleteMapping(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.index = function (collection, id, data) {
        var deferred = Q.defer();

        var params = {};
        params.index = index;
        params.type = collection;
        params.id = ''+id;
        params.body = data;

        client.index(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.delete = function (collection, id) {
        var deferred = Q.defer();

        var params = {};
        params.index = index;
        params.type = collection;
        params.id = ''+id;

        client.delete(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.search = function (collection, query) {
        var deferred = Q.defer();

        var params = {};
        params.index = index;
        params.type = collection;
        params.q = query;

        client.search(params, deferred.makeNodeResolver());

        return deferred.promise;
    }
}
