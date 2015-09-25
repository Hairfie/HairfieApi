'use strict';

var app = require('../..');
var q = require('q');
var lodash = require('lodash');
var Category = app.models.Category;
var getSlug = require('speakingurl');

updateCategories()
    .then(function () {
        console.log('Successfully seeded categories.');
        process.exit(0);
    })
    .catch(function (error) {
        console.log('Failed to seed categories:', error);
        process.exit(1);
    });

function updateCategories() {
    return q.ninvoke(Category, 'find', {}).then(function (categories) {
        return q.all(categories.map(function (category) {
            return q.ninvoke(category, 'updateAttributes', {slug: getSlug(category.description), label: category.description});
        }));
    });
}