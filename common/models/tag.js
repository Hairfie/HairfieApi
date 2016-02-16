'use strict';

var Promise = require('../../common/utils/Promise');
var Hooks = require('./hooks');
var _ = require('lodash');

module.exports = function (Tag) {
    Hooks.generateId(Tag);
    Hooks.updateTimestamps(Tag);

    Tag.prototype.toRemoteShortObject = function (context) {
        return {
            id          : this.id,
            href        : Tag.app.urlGenerator.api('tags/'+this.id),
            name        : context.localized(this.name),
            position    : this.position
        }
    }

    Tag.prototype.toRemoteObject = function(context) {
        var obj = this.toRemoteShortObject(context);
        obj.category = Promise.npost(this, 'category').then(function (category) {
            return category ? category.toRemoteShortObject(context) : null;
        });

        return obj;
    }

    function filterFromTags(tags) {
        return _.map( _.groupBy(tags, 'categoryId'), function(cat){ 
            return '(' + _.map(cat, 'name.fr').join(',') + ')';
        }).join(',');
    }

    Tag.filterFromTagNames = function(tagNames) {
        return Promise.ninvoke(this, 'find', {where: {"name.fr": {"inq": tagNames}}})
        .then(function(tags) {
            console.log("filterFromTagNames", filterFromTags(tags));
            if(!tags) return null;
            return filterFromTags(tags);
        })
    }
};