'use strict';

var Promise = require('../../common/utils/Promise');
var locale = require('locale');
var _ = require('lodash');

module.exports = function mountRestApi(server) {
    // we need to wait for the custom routes to be defined
    server.on('routes defined', function () {
        var restApiRoot = server.get('restApiRoot');

        server.use('/:apiVersion', function (req, res, next) {
            req.apiVersion = req.params.apiVersion;
            console.log('api version :', req.apiVersion);
            next();
        });

        server.use('/v1', function (req, res, next) {
            req.isExp = true;
            next();
        });

        server.use('/old', function (req, res, next) {
            res.send("Outdated");
        });

        server.use('/:apiVersion', server.loopback.rest());
    });

    var remotes = server.remotes();

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

function processResult(Model, context, result, short) {
    if (null === result || undefined === result) return Promise(result);
    if (Array.isArray(result)) {
        return Promise.map(result, function (record) {
            return processResult(Model, context, record, short || !context.isMobile());
        });
    }

    if (short && result.toRemoteShortObject) {
        return Promise(result.toRemoteShortObject(context)).then(Promise.resolveDeep);
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

    if(_.isString(value)) return value;

    var supported = new locale.Locales(Object.keys(value)),
        current   = new locale.Locales(this.options.request.locale),
        best      = current.best(supported).toString();

    return value[best];
};

Context.prototype.localiseWebUrl = function (host) {
    if (!host) return;

    var supported = new locale.Locales(['fr', 'en']),
        current   = new locale.Locales(this.options.request.locale),
        best      = current.best(supported).toString();

    return host + '/' + best;
};

Context.prototype.getUser = function () {
    return this.options.request.user;
};

Context.prototype.isMobile = function () {
    return !this.isExp();
};

Context.prototype.isExp = function () {
    return this.options.request.isExp;
};
