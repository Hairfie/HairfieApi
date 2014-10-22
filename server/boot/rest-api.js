'use strict';

var Promise = require('../../common/utils/Promise');
var locale = require('locale');

module.exports = function mountRestApi(server) {
    var restApiRoot = server.get('restApiRoot');
    server.use(restApiRoot, server.loopback.rest());

    var remotes = server.remotes();

    // apply virtual & hidden properties config
    remotes.after('**', function (ctx, next, method) {
        if (!ctx.result) next();
        var Model   = method.ctor,
            context = new Context({
                request: ctx.req
            });

        processResult(Model, context, ctx.result)
            .then(
                function (result) { ctx.result = result; next(); },
                function (error) { next(error); }
            );
    });
};

function processResult(Model, context, result) {
    if (null === result || undefined === result) return Promise(result);

    if (Array.isArray(result)) {
        return Promise.map(result, function (record) {
            return processResult(Model, context, record);
        });
    }

    if (result.toRemoteObject) {
        return Promise(result.toRemoteObject(context)).then(Promise.resolveDeep);
    }

    if (result.toObject) {
        return Promise(result.toObject());
    }

    return Promise(result);
}

function Context(options) {
    if (!this instanceof Context) return new Context(options);
    this.options = options;
}

Context.prototype.localized = function (value) {
    if (!value) return;

    var supported = new locale.Locales(Object.keys(value)),
        current   = new locale.Locales(this.options.request.locale),
        best      = current.best(supported).toString();

    return value[best];
};
