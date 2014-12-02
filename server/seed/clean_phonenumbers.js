var app = require('../..');
var q = require('q');
var Business = app.models.Business;
var lodash = require('lodash');

findBadPhoneNumberBusinesses()
    .then(function(businesses) {
        console.log(businesses);
        console.log("Found : ", businesses.length);
        return q.all(businesses.map(updateBusiness));
    })
    .then(function (results) {
        console.log('Successfull.');
        process.exit(0);
    })
    .catch(function (error) {
        console.log('Failed to seed tags:', error);
        process.exit(1);
    });

function findBadPhoneNumberBusinesses() {
    return q.ninvoke(Business, 'find', {where: {phoneNumber: /\s/}});
}

function updateBusiness(business) {
    var cleanPhoneNumber = business.phoneNumber.replace(/\s/g, '');
    return q.ninvoke(business, 'updateAttributes', {phoneNumber : cleanPhoneNumber});
}