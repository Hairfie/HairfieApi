'use strict';

var Q = require('q');
var _ = require('lodash');

module.exports = function (Model, options) {
    var options = options || {};

    console.assert(options.index, 'An "index" option must be specified');

    // create/udpate search document where record is saved
    Model.observe('after save', function (ctx, next) {
        var Engine = Model.app.models.AlgoliaSearchEngine;

        var getInstance = Q(null);
        if (ctx.instance) getInstance = Q(ctx.instance);
        else {
            var id = tryGetId(ctx.where);
            if (id) getInstance = Q.ninvoke(Model, 'findById', id);
        }

        getInstance
            .then(function (instance) {
                if (!instance) return null;
                else return instance.toSearchDocument();
            })
            .then(function (doc) {
                Engine.saveObject(options.index, doc);
            })
            .fail(console.log);

        next(); // fire and forget
    });

    // remove search document where record is deleted
    Model.observe('before delete', function (ctx, next) {
        var Engine = Model.app.models.AlgoliaSearchEngine;
        var id = tryGetId(ctx.where);
        if (id) {
            Engine.delete(options.index, id).fail(console.log);
        }

        next(); // fire and forget
    });
};

function tryGetId(where) {
    if (where.id && _.keys(where).length == 1) return where.id;
}
