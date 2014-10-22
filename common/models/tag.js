'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (Tag) {
    Tag.prototype.toRemoteObject = function (context) {
        return {
            id          : this.id,
            name        : context.localized(this.name),
            category    : Promise.npost(this, 'category').then(function (category) {
                return category ? category.toRemoteShortObject(context) : null;
            })
        };
    };
};
