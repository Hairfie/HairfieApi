"use strict";

var extend = require('extend');

// Extends some basic class
require('../utils/String');
require('../utils/Geopoint');

var Abstract = function () {};

Abstract.extend = function (Object) {
    Object.prototype = extend(Object.prototype, new Abstract);

    // add support for hidden & virtual properties
    Object.afterRemote('**', function (ctx, _, next) {
        var hasIdValues = function (model) {
            return Object.definition._ids.every(function (id) {
                return !!model[id.name];
            });
        }

        var addVirtuals = function (model) {
            if (!Object.definition.settings.virtuals) return;

            for (var property in Object.definition.settings.virtuals) {
                model[property] = Object.definition.settings.virtuals[property](model);
            }
        }

        var removeHidden = function (model) {
            for (var property in model) if (Object.isHiddenProperty(property)) {
                delete model[property];
            }
        }

        if (ctx.result) {
            if (Array.isArray(ctx.result)) {
                ctx.result.forEach(function (item) {
                    if (hasIdValues(item)) {
                        addVirtuals(item);
                        removeHidden(item);
                    }
                });
            } else {
                if (hasIdValues(ctx.result)) removeHidden(addVirtuals(ctx.result));
            }
        }

        next()
    });

    return extend(new Object, Abstract);
};

module.exports = Abstract;
