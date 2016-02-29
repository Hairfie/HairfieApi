'use strict';

var Hooks = require('./hooks');
var _ = require('lodash');
var Promise = require('../../common/utils/Promise');
var getSlug = require('speakingurl');

module.exports = function(Selection) {
    Hooks.generateId(Selection);
    Hooks.updateTimestamps(Selection);

    Selection.prototype.toRemoteObject =
    Selection.prototype.toRemoteShortObject = function (context) {
        return {
            id          : this.id,
            href        : Selection.app.urlGenerator.api('selections/'+this.id),
            name        : this.name,
            label       : this.label,
            slug        : this.slug,
            active      : this.active,
            position    : this.position
        };
    };
};
