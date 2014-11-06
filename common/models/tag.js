'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (Tag) {
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
            name        : context.localized(this.name),
            position    : this.position,
        };
    };
};
