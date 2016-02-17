var app = require('../..');
var categoriesValues = require('./newTags.json');
var q = require('q');
var TagCategory = app.models.TagCategory;
var Tag = app.models.Tag;

saveCategories(categoriesValues)
    .then(function () {
        console.log('Successfully seeded tags.');
        process.exit(0);
    })
    .catch(function (error) {
        console.log('Failed to seed tags:', error);
        process.exit(1);
    });

function saveCategories(categoriesValues) {
    return q.all(categoriesValues.map(saveCategory));
}

function saveCategory(categoryValues, position) {
    return q.ninvoke(TagCategory, 'findOrCreate', {where: {"name.fr": categoryValues.name.fr} }, {
            name    : categoryValues.name,
            position: position
        })
        .then(function (category) {
            console.log("category :", category);
            return saveTags(category, categoryValues.tags);
        });
}

function saveTags(category, tagsValues) {
    return q.all(tagsValues.map(saveTag.bind(null, category)));
}

function saveTag(category, tagValues, position) {
    return q.ninvoke(Tag, 'findOrCreate', {where: {"name.fr": tagValues.name.fr} }, {
        categoryId  : category.id,
        name        : tagValues.name,
        position    : position
    });
}
