'use strict';

var app = require('../..');
var Promise = require('../../common/utils/Promise');
var q = require('q');
var _ = require('lodash');

var Business = app.models.Business;

function save() {
return q.ninvoke(Business, 'findOne', {where: {_id: "4d2a2a32-4e39-45d9-979e-3b7bbe743870"}})
        .then(function (business) {
                business.exept = {"25 December 2015": [{"startTime": "10:00", "endTime": "17:00"}, {"startTime": "19:00", "endTime": "23:00"}], "14 July 2016": []};
                return q.ninvoke(business, 'save');
        })
}

save()
    .then(function () {
        console.log('Successfully seeded places.');
        process.exit(0);
        })
    .catch(function (error) {
        console.log('Failed to seed places:', error);
        process.exit(1);
    });;