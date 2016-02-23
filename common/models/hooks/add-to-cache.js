'use strict';

var Promise = require('../../../common/utils/Promise');

var cacheKey = function(id) {
    return "business-" + id;
}

module.exports = function (Model) {
    Model.observe('after save', function addToCache(ctx, next) {
        var cacheClient = Model.app.cacheClient;

        Promise(ctx.instance.toRemoteObject())
            .then(function(business) {
                var data = {
                    name: cacheKey(business.id),
                    body: JSON.stringify(business),
                    options: {
                        expire: 60 * 60 * 24, 
                        type: 'json'
                    }
                }

                return Promise.ninvoke(cacheClient, 'add', data.name, data.body, data.options)
            })
            .then(function(added) {
                console.log("addedTocache", added);
                return;
            })
        next();
    });

    Model.findFromCache = function(id) {
        var cacheClient = Model.app.cacheClient;
        return Promise.ninvoke(cacheClient, 'get', cacheKey(id))
        .then(function(entries) {
            if(entries && entries.length == 1) {
                return JSON.parse(entries[0].body)
            } else {
                return Promise.ninvoke(Model, 'findById', id)
                .then(function(modelInstance) {
                    return Promise(modelInstance.toRemoteObject());
                })
                .fail(function(error) {
                    console.log("error", error);
                })
            }
        });
    }
};