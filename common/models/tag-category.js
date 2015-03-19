'use strict';

var Hooks = require('./hooks');

module.exports = function (TagCategory) {
    Hooks.generateId(TagCategory);
    Hooks.updateTimestamps(TagCategory);

    TagCategory.prototype.toRemoteShortObject = function (context) {
        return {
            id          : this.id,
            href        : TagCategory.app.urlGenerator.api('tagCategories/'+this.id),
            name        : context.localized(this.name),
            position    : this.position,
        };
    };
};
