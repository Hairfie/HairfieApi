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
            client = elasticsearch.Client({host: getSettings().host});
        }

        return client;
    }

    SearchEngine.defineMapping = function (collection, mapping) {
        var deferred = Q.defer();

        var params = {};
        params.index = getIndex();
        params.type = collection;
        params.body = mapping;

        getClient().indices.putMapping(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.clear = function (collection) {
        var deferred = Q.defer();

        var params = {};
        params.index = getIndex();
        params.type = collection;

        getClient().indices.deleteMapping(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.index = function (collection, id, data) {
        var deferred = Q.defer();

        var params = {};
        params.index = getIndex();;
        params.type = collection;
        params.id = ''+id;
        params.body = data;

        getClient().index(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.delete = function (collection, id) {
        var deferred = Q.defer();

        var params = {};
        params.index = getIndex();;
        params.type = collection;
        params.id = ''+id;

        getClient().delete(params, deferred.makeNodeResolver());

        return deferred.promise;
    }

    SearchEngine.search = function (collection, query) {
        var deferred = Q.defer();

        var params = {};
        params.index = getIndex();;
        params.type = collection;
        params.q = query;

        getClient().search(params, deferred.makeNodeResolver());

        return deferred.promise;
    }
}
