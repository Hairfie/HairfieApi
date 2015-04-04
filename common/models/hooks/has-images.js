'use strict';

var _ = require('lodash');
var Q = require('q');

module.exports = function (Model, options) {

    // QUICK FIX: why?
    Model.beforeRemote('create', function (ctx, unused, next) {
        _.forIn(options, function (settings, property) {
            var val = ctx.req.body[property];
            if (val) {
                if (_.isArray(val)) {
                    ctx.req.body[property] = _.map(val, function (v) {
                        return _.isString(v) ? {id: v} : v;
                    });
                } else {
                    ctx.req.body[property] = _.isString(val) ? {id: val} : val;
                }
            }
        });
        next();
    });


    Model.observe('before save', function (ctx, next) {
        var Image = Model.app.models.Image;

        var model  = ctx.instance || ctx.data;
        var strict = !!ctx.instance;

        bindImages(Image, options, model, strict).then(next.bind(null, null), next);
    });
};

function bindImages(Image, options, model, strict) {
    return Q.all(_.map(options, function (def, prop) {
        return bindImage(Image, def, model, prop, strict);
    }));
}

function bindImage(Image, def, model, prop, strict) {
    var val = model[prop];

    if (!strict && _.isUndefined(val)) return Q(null); // don't touch!

    if (!_.isArray(val)) val = new Array(val);
    var ids = _.filter(_.map(val, function (x) { return _.result(x, 'id', x); }), _.isString);

    if (!def.multi) ids = ids.slice(0, 1);

    var deferred = Q.defer();
    Image.findByIds(ids, function (error, images) {
        if (error) return deferred.reject(error);
        if (def.container) images = _.where(images, {container: def.container});
        model[prop] = def.multi ? images : _.first(images);
        deferred.resolve(null);
    });

    return deferred.promise;
}
