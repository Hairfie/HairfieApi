'use strict';
var Promise = require('../common/utils/Promise');
var _ = require('lodash');
var request = require('superagent');
var Promise = require('../common/utils/Promise');
var cheerio = require('cheerio');
var nodePhone = require('node-phonenumber')
var phoneUtil = nodePhone.PhoneNumberUtil.getInstance();

function onProgress(progress) {
   console.log('Done '+progress.done+' businesses');
}

module.exports = function (program, app) {
    var Business = app.models.Business;

    program
        .command('update-pages-jaunes')
        .description('Update Pages Jaunes')
        .action(function () {

        var onProgress = onProgress || _.noop;
        var chunkSize = 50;

        return Promise.ninvoke(Business, 'count')
            .then(function (total) {
                var loop = function (skip) {
                    onProgress({total: total, done: skip});

                    return Promise.ninvoke(Business, 'find', {limit: chunkSize, skip: skip, order: 'updatedAt ASC', where: {"address.city": "Paris"}})
                        .then(function (businesses) {
                            return Promise.all(_.map(businesses, function(business) {
                                return updatePhoneNumbers(business);
                            }))
                            .then(function () {
                                //return;
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

function updatePhoneNumbers(business) {
    console.log("business ", business.name)
    console.log("businessId ", business.id)

    if(business.pagesJaunes && business.pagesJaunes.url) {
        console.log("business.pagesJaunes ", business.pagesJaunes);

        return getHtmlFromUrl(business.pagesJaunes.url)
            .catch(function(error) {
                console.log("error, continuying");
            })
            .then(function(html) {
                if(!html) return;
                var $ = cheerio.load(html);
                var phones = [];
                $('span.coord-numero').each(function(i, element){
                    phones.push(formatPhoneNumber($(this).text()));
                });
                return phones;
            })
            .then(function(phones) {
                if(!phones) return;
                phones.push(formatPhoneNumber(business.phoneNumber));
                phones = _.uniq(phones, 'number');
                business.phones = phones;
                console.log("business phones", phones);
                return Promise.npost(business, 'save');
            })
    }
}

function formatPhoneNumber(phoneNumber) {
    return {
        number: phoneUtil.format(phoneUtil.parse(phoneNumber,'FR'), nodePhone.PhoneNumberFormat.E164),
        main: false
    }
}

function getHtmlFromUrl(url) {
    var deferred = Promise.defer();
    console.log("url", url);
    request
        .get(url)
        .end(function (error, response) {
            if (error) {
                console.log("error in getHtmlFromUrl", error.status);
                return deferred.reject(error);
            }
            deferred.resolve(response.text);
        });

    return deferred.promise;
};