'use strict';

var Hooks = require('./hooks');

module.exports = function(Category) {
    Hooks.generateId(Category);
    Hooks.updateTimestamps(Category);
    Hooks.hasImages(Category, {
        picture: {
            container: 'categories'
        }
    });

    Category.prototype.toRemoteObject =
    Category.prototype.toRemoteShortObject = function (context) {
        return {
            id          : this.id,
            href        : Category.app.urlGenerator.api('categories/'+this.id),
            name        : this.name,
            description : this.description,
            tags        : this.tags,
            picture     : this.picture && this.picture.toRemoteShortObject(context),
            position    : this.position
        };
    };
};
