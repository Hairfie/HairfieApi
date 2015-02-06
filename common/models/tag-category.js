'use strict';

var UUID = require('uuid');

module.exports = function (TagCategory) {
    TagCategory.beforeCreate = function (next) {
        this.id = this.id || UUID.v4();
        next();
    };

    TagCategory.prototype.toRemoteShortObject = function (context) {
        return {
            id          : this.id,
            name        : context.localized(this.name),
            position    : this.position,
        };
    };
};
