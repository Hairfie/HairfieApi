'use strict';

var app = require('../..');
var q = require('q');
var Service = app.models.Service;
var servicesValues = require('./services.json');

saveServices(servicesValues)
    .then(function () {
        console.log('Successfully seeded tags.');
        process.exit(0);
    })
    .catch(function (error) {
        console.log('Failed to seed tags:', error);
        process.exit(1);
    });

function saveServices(servicesValues) {
    return q.all(servicesValues.map(saveService));
}

function saveService(serviceValues) {
    return q.npost(Service, 'create', [{
        label: serviceValues.label
    }]);
}
