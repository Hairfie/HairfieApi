'use strict';

var Promise = require('../../common/utils/Promise');
var Hooks = require('./hooks');

module.exports = function (Tag) {
    Hooks.generateId(Tag);
    Hooks.updateTimestamps(Tag);

    Tag.prototype.toRemoteObject = function (context) {
        return Promise(this.toRemoteShortObject(context))
            .then((function (obj) {
                obj.category = Promise.npost(this, 'category').then(function (category) {
                    return category ? category.toRemoteShortObject(context) : null;
                });

                return obj;
            }).bind(this));
    };

    Tag.prototype.toRemoteShortObject = function (context) {
        return {
            id          : this.id,
            href        : Tag.app.urlGenerator.api('tags/'+this.id),
            name        : context.localized(this.name),
            position    : this.position,
        };
    };
};
