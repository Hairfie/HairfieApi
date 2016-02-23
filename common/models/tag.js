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
            name        : context && context.localized(this.name) || this.name.fr,
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
};