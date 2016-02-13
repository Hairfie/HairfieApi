'use strict';

var Promise = require('../../common/utils/Promise');
var _ = require('lodash');

module.exports = function (MemoryTag) {
    MemoryTag.find = function(filter) {
        var Tag = MemoryTag.app.models.Tag;
        console.log("here");
        return Promise.ninvoke(Tag, 'find', filter);
    }

    MemoryTag.findByIds = function(filter, callback) {
        var Tag = MemoryTag.app.models.Tag;
        console.log("######### here");
        Tag.findByIds.apply(this, arguments)
    }
};