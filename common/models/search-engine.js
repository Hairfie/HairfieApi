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
}
