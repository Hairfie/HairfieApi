'use strict';

var app = require('../..');
var q = require('q');
var lodash = require('lodash');
var Category = app.models.Category;
var Tag = app.models.Tag;
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
    return q.ninvoke(Tag, 'find', {where: {"name.fr": {inq: categoryDefinition.tagNames}}})
        .then(function(tags) {
            console.log(tags.length + " tags trouvés avec la requête " + categoryDefinition.tagNames);
            return q.ninvoke(Category, 'create', {
                name        : categoryDefinition.name,
                description : categoryDefinition.description,
                label       : new String(),
                slug        : new String(),
                tags        : lodash.map(tags, 'id'),
                picture     : categoryDefinition.pictureName,
                position    : categoryDefinition.position
            });
        });
}