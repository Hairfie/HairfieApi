'use strict';

var app = require('../..');
var q = require('q');
var Place = app.models.Place;
var placesDefinitions = require('./places.json');

savePlaces(placesDefinitions)
    .then(function () {
        console.log('Successfully seeded places.');
        process.exit(0);
    })
    .catch(function (error) {
        console.log('Failed to seed places:', error);
        process.exit(1);
    });

function savePlaces(placesDefinitions) {
    return q.all(placesDefinitions.map(savePlace));
}

function savePlace(placeDefinition) {
    return q.ninvoke(Place, 'create', {
        name: placeDefinition.name,
        description: placeDefinition.description,
        zipCodes: placeDefinition.zipCodes
    });
}