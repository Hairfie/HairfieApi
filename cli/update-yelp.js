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
        .option('-c, --city [city]', 'CityName')
        .option('-d, --department [department]', 'County Code')
        .description('Update Yelp Ids and Reviews')
        .action(function (program) {

        var city = program.city;
        var department = program.department;

        var onProgress = onProgress || _.noop;
        var chunkSize = 50;

        return Promise.ninvoke(Business, 'count')
            .then(function (total) {
                var loop = function (skip) {
                    onProgress({total: total, done: skip});

                    var filters = {};

                    if(city) {
                        filters = {limit: chunkSize, skip: skip, order: 'updatedAt ASC', where: {"address.city": city}}
                    } else if(department) {
                        filters = {limit: chunkSize, skip: skip, order: 'updatedAt ASC', where: {"googleMapsGeo.countyCode": department}}
                    } else {
                        filters = {limit: chunkSize, skip: skip, order: 'updatedAt ASC'}
                    }

                    console.log("filters", filters);


                    return Promise.ninvoke(Business, 'find', filters)
                        .then(function (businesses) {
                            return Promise.all(_.map(businesses, function(business) {
                                return business.getYelpId()
                                .then(function(b) {
                                    if(!b) return;

                                    return b.getYelpObject();
                                })
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