'use strict';

var app = require('../..');
var q = require('q');
var Service = app.models.Service;
var serviceDefinitions = require('./services.json');

saveServices(serviceDefinitions)
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

function saveService(serviceDefinitions) {
    var saves = serviceVariations(serviceDefinitions).map(saveServiceVariation);

    return q.all(saves);
}

function saveServiceVariation(serviceValues) {
    return q.ninvoke(Service, 'create', {
        label: serviceValues.label
    });
};

function serviceVariations(serviceDefinition) {
    var variations = [];
    variations.push({label: {fr: serviceDefinition.label}});

    // service x gender
    (serviceDefinition.gender || []).map(function (gender) {
        variations.push({label: {fr: serviceDefinition.label+' - '+gender}});

        // service x gender x length
        (serviceDefinition.length || []).map(function (length) {
            variations.push({label: {fr: serviceDefinition.label+' - '+gender+' - '+length}});
        });
    });

    // service x length
    (serviceDefinition.length || []).map(function (length) {
        variations.push({label: {fr: serviceDefinition.label+' - '+length}});
    });

    return variations;
}

