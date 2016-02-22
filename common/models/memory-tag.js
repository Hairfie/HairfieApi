'use strict';

var Promise = require('../../common/utils/Promise');
var Q = require('q');
var _ = require('lodash');

module.exports = function (MemoryTag) {
    var tags = [];

    function filterFromTags(tags) {
        return _.map( _.groupBy(tags, 'categoryId'), function(cat){ 
            return '(' + _.map(cat, 'name.fr').join(',') + ')';
        }).join(',');
    }

    function tagFromNames(allTags, names) {
        return _.filter(tags, function(tag) {
            _.includes(names, tag.name.fr);
        });
    }

    function tagFromIds(allTags, ids) {
        return _.filter(allTags, function(tag) {
            return _.includes(ids, tag.id);
        });
    }

    MemoryTag.getAllTags = function() {
        var Tag = MemoryTag.app.models.Tag;
        if(_.isEmpty(tags)) {
            var tagPromise = Promise.ninvoke(Tag, 'find', {})
            .then(function(result) {
                tags = result;
                return tags;
            })
        } else {
            tagPromise = Promise(tags);
        }

        return tagPromise;
    }

    MemoryTag.filterFromTagNames = function(tagNames) {
        return this.getAllTags()
        .then(function(allTags) {
            return tagFromNames(allTags, tagNames);
        })
        .then(function(selectedTags) {
            if(!selectedTags) return null;
            return filterFromTags(selectedTags);
        })
    }

    MemoryTag.tagFromIds = function(ids) {
        return this.getAllTags()
        .then(function(allTags) {
            var result = tagFromIds(allTags, ids);
            return result;
        })
        .fail(function (error) {
            console.log('Error ', error);
        });
    }

    MemoryTag.test = function() {
        return Q(null);
    }
};