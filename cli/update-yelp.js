'use strict';
var Promise = require('../common/utils/Promise');
var _ = require('lodash');

function onProgress(progress) {
   console.log('Done '+progress.done+' businesses');
}

module.exports = function (program, app) {
    var Business = app.models.Business;

    program
        .command('update-yelp')
        .description('Update Yelp Ids and Reviews')
        .action(function () {

        var onProgress = onProgress || _.noop;
        var chunkSize = 50;

        return Promise.ninvoke(Business, 'count')
            .then(function (total) {
                var loop = function (skip) {
                    onProgress({total: total, done: skip});

                    return Promise.ninvoke(Business, 'find', {limit: chunkSize, skip: skip, order: 'updatedAt DESC'})
                        .then(function (businesses) {
                            return Promise.all(_.map(businesses, function(business) {
                                return business.getYelpObject();
                            }))
                            .then(function () {
                                return businesses.length < chunkSize ? null : loop(skip + chunkSize);
                            });
                        });
                };

                return loop(0);
            })
            .then(function(result) {
                console.log("Success", result);
                process.exit(0);
            })
            .catch(function (error) {
                console.log('Fail', error);
                process.exit(1);
            })
        });
};