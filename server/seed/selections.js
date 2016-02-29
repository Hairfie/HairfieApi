'use strict';

var app = require('../..');
var _ = require('lodash');
var Promise = require('../../common/utils/Promise');
var Selection = app.models.Selection;
var getSlug = require('speakingurl');

var selectionsDefinitions = require('./selections.json');

saveSelections(selectionsDefinitions)
    .then(function () {
        console.log('Successfully seeded selections.');
        process.exit(0);
    })
    .catch(function (error) {
        console.log('Failed to seed selections:', error);
        process.exit(1);
    });


function saveSelections(selectionsDefinitions) {
    return Promise.all(selectionsDefinitions.map(saveSelection));
}

function saveSelection(selectionDefinition, position) {
    return Promise.ninvoke(Selection, 'findOrCreate', {where: { slug: selectionDefinition.slug }}, {
        name        : selectionDefinition.name,
        label       : selectionDefinition.label,
        slug        : selectionDefinition.slug,
        active      : selectionDefinition.active,
        description : selectionDefinition.description,
        position    : selectionDefinition.position
    })
}