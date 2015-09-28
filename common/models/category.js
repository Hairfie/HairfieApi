'use strict';

var Hooks = require('./hooks');
var Q = require('q');
var _ = require('lodash');

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
            name        : context.localized(this.name),
            description : context.localized(this.description),
            label       : this.label,
            slug        : this.slug,
            tags        : this.tags,
            picture     : this.picture && this.picture.toRemoteShortObject(context),
            position    : this.position
        };
    };

    Category.listForTagsAndGenders = function (tags, genders) {
        return Q.ninvoke(Category, 'find', {
            where: {
                or: [
                    {tags: {inq: _.pluck(tags, 'id')}},
                    {genders: {inq: _.map(genders, function (g) { return (g || '').toLowerCase(); })}}
                ]
            }
        })
        .then(function(categories) {
            return _.map(categories, function(cat) {
                if(_.isString(cat.name)) {
                    return cat;
                } else {
                    cat.name = cat.name.fr;
                    cat.description = cat.description.fr;
                    return cat;
                }
            })
        })
    };

    Category.getByIds = function (categoriesId) {
        if(!categoriesId) return [];

        return Q.ninvoke(Category, 'findByIds', categoriesId)
        .then(function(categories) {
            if(!categories) return [];
            return _.map(categories, function(cat) {
                if(_.isString(cat.name)) {
                    return cat;
                } else {
                    cat.name = cat.name.fr;
                    cat.description = cat.description.fr;
                    return cat;
                }
            })
        })
    };
};
