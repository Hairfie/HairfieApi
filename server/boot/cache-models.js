'use strict';

var cache = require('express-redis-cache');
var _ = require('lodash');

module.exports = function (app) {
    // var client = app.cacheClient;
    // var Tag = app.models.Tag;
    // var find = Tag.find;
    // var findByIds = Tag.findByIds;
    // var cache = {};

    // Tag.findByIds = function(filter, cb) {
    //     var key = 'tag-findByIds';
    //     if(filter) {
    //         key += JSON.stringify(filter);
    //     }
    //     var cachedResults = cache[key];
    //     if(cachedResults) {
    //         console.log('serving findByIds from cache');
    //         process.nextTick(function() {
    //             cb(null, cachedResults);
    //         });
    //     } else {
    //         console.log('serving findByIds from db');
    //         find.call(Tag, function(err, results) {
    //             if(!err) {
    //                 cache[key] = results;
    //             }
    //             cb(err, results);
    //         });
    //     }
    // }

    // Tag.find = function(filter, cb) {
    //     var key = 'tag-find';
    //     if(filter) {
    //         key += JSON.stringify(filter);
    //     }
    //     var cachedResults = cache[key];
    //     if(cachedResults) {
    //         console.log('serving find from cache');
    //         process.nextTick(function() {
    //             cb(null, cachedResults);
    //         });
    //     } else {
    //         console.log('serving find from db');
    //         find.call(Tag, function(err, results) {
    //             if(!err) {
    //                 cache[key] = results;
    //             }
    //             cb(err, results);
    //         });
    //     }
    // }
};