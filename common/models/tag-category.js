'use strict';

module.exports = function (TagCategory) {
    TagCategory.prototype.toRemoteShortObject = function (context) {
        return {
            id      : this.id,
            name    : context.localized(this.name),
        };
    };
};
