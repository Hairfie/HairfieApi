'use strict';

var app = require('../..');
var q = require('q');
var Category = app.models.Category;
var categoriesDefinitions = require('./categories.json');

saveCategories(categoriesDefinitions)
    .then(function () {
        console.log('Successfully seeded categories.');
        process.exit(0);
    })
    .catch(function (error) {
        console.log('Failed to seed categories:', error);
        process.exit(1);
    });

function saveCategories(categoriesDefinitions) {
    return q.all(categoriesDefinitions.map(saveCategory));
}

function saveCategory(categoryDefinition) {
    return q.ninvoke(Category, 'create', {
        name        : categoryDefinition.name,
        description : categoryDefinition.description,
        tags        : categoryDefinition.tags,
        picture     : categoryDefinition.pictureName
    });
}