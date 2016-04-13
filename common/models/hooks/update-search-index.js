'use strict';

var Q = require('q');
var _ = require('lodash');

/**
 * TODO: 2015-04-15 Antoine: guess index from the data-source configuration
 * TODO: 2015-04-15 Antoine: automatically add the hook to models based on the
 *                           data-source configuration
 */

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
                return Engine.saveDocument(options.index, doc);
            })
            .fail(function (error) {
                console.log('Failed to update search document:', error, error.stack);
            });

        next(); // fire and forget
    });

    // remove search document where record is deleted
    Model.observe('before delete', function (ctx, next) {
        console.log("before delete !");
        var Engine = Model.app.models.AlgoliaSearchEngine;
        var id = tryGetId(ctx.where);
        if (id) {
            console.log("deleteFromEngine");
            Engine.deleteDocument(options.index, id).fail(console.log);
        }

        next(); // fire and forget
    });

    Model.prototype.deleteFromEngine = function() {
        var Engine = Model.app.models.AlgoliaSearchEngine;
        if (this.id) {
            console.log("deleteFromEngine");
            Engine.deleteDocument(options.index, this.id).fail(console.log);
        }
    }
};

function tryGetId(where) {
    if (where.id && _.keys(where).length == 1) return where.id;
}
