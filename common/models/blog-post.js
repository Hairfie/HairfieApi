'use strict';

var Q = require('q');
var _ = require('lodash');
var WP = require('wordpress-rest-api');

module.exports = function (BlogPost) {
    var wp;
    BlogPost.on('dataSourceAttached', function () {
        wp = new WP({ endpoint: BlogPost.dataSource.settings.endpoint });
    });

    BlogPost.posts = function (limit, next) {
        var limit = limit || 3;

        return wp.posts().perPage(limit)
        .then(function(data) {
            return data;
        })
        .catch(function( err ) {
           console.log("error", err);
           return [];
        });
    };


    BlogPost.remoteMethod('posts', {
        description: 'Returns the last posts',
        accepts: [
            {arg: 'limit', type: 'number', description: 'Maximum number of posts (default 3)'}
        ],
        returns: {arg: 'posts', root: true},
        http: { verb: 'GET', path: '/' }
    });
};