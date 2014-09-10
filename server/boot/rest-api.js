'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function mountRestApi(server) {
    var restApiRoot = server.get('restApiRoot');
    server.use(restApiRoot, server.loopback.rest());

    var remotes = server.remotes();

    // apply virtual & hidden properties config
    remotes.after('**', function (ctx, next, method) {
        if (!ctx.result) next();
        var Model = method.ctor;

        processResult(Model, ctx.result)
            .then(
                function (result) { ctx.result = result; next(); },
                function (error) { next(error); }
            );
    });
};

function processResult(Model, result) {
    if (Array.isArray(result)) {
        return Promise.map(result, function (record) {
            return processResult(Model, record);
        });
    }

    if (result.toRemoteObject) {
        return Promise(result.toRemoteObject()).then(Promise.resolveDeep);
    }

    if (result.toObject) {
        return Promise(result.toObject());
    }

    return Promise(result);
}
