var app = require('../..');
var q = require('q');
var Business = app.models.Business;
var lodash = require('lodash');

findBusiness()
    .then(function (results) {
        console.log('Successfull.');
        process.exit(0);
    })
    .catch(function (error) {
        console.log('Failed to seed tags:', error);
        process.exit(1);
    });

function findBusiness(skip) {
    skip = skip || 0;
    return q.ninvoke(Business, 'find', {limit: 100, skip: skip})
        .then(function(businesses) {
            console.log("Found : ", (businesses.length + skip));
            return q.all(businesses.map(updateBusiness))
                .then(function() {
                    if (businesses.length < 100) return;
                    return findBusiness(skip + 100);
                });
        });
}

function updateBusiness(business) {
    if (business && business.accountType == "FREE") {
        return business.isClaimed()
            .then(function(results) {
                if (results && business) {
                    return q.ninvoke(business, 'updateAttributes', {accountType: "BASIC"});
                }
                else {
                    return;
                }
        });
    }
}