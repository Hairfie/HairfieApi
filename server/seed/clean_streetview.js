var app = require('../..');
var q = require('q');
var Business = app.models.Business;
var lodash = require('lodash');

findStreetViewedBusinesses()
    .then(function(businesses) {
        console.log(businesses.length);
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

function findStreetViewedBusinesses() {
    return q.ninvoke(Business, 'find', {where: {pictures: /streetview/}});
}

function updateBusiness(business) {
    var pattern = /^((http|https):\/\/)/;
    pictures = lodash.filter(business.pictures, function(url) { return !pattern.test(url)});
    return q.ninvoke(business, 'updateAttributes', {pictures : pictures});
}