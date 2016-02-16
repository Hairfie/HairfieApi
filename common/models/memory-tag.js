'use strict';

var Promise = require('../../common/utils/Promise');
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
          return _.includes(names, tag.name.fr);
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
            console.log("########### tagFromMemory ", tags.length);
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
};