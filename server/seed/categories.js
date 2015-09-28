'use strict';

var app = require('../..');
var _ = require('lodash');
var q = require('q');
var lodash = require('lodash');
var Category = app.models.Category;
var Tag = app.models.Tag;
var getSlug = require('speakingurl');

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

function saveCategory(categoryDefinition, position) {
    return q.ninvoke(Tag, 'find', {where: {"name.fr": {inq: categoryDefinition.tagNames}}})
        .then(function(tags) {
            console.log(tags.length + " tags trouvés avec la requête " + categoryDefinition.tagNames);
            console.log(categoryDefinition);

            return q.ninvoke(Category, 'findOrCreate', {where: { name: categoryDefinition.name }}, {
                name        : categoryDefinition.name,
                label       : categoryDefinition.label,
                slug        : getSlug(categoryDefinition.label),
                tags        : _.map(tags, 'id') || [],
                position    : categoryDefinition.position
            })
            .then(function (cat) {
                cat = _.isArray(cat) ? cat[0] : cat;

                cat.label = categoryDefinition.label;
                cat.tags = _.map(tags, 'id') || [];
                cat.position = categoryDefinition.position;
                cat.slug = getSlug(categoryDefinition.label);

                return q.ninvoke(cat, 'save');
            })
        });
}