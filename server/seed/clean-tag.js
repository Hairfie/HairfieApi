var app = require('../..');
var seedJSON = require('./fullTagsClean.json');
var q = require('q');
var Promise = require('../../common/utils/Promise');
var TagCategory = app.models.TagCategory;
var Tag = app.models.Tag;
var _ = require('lodash');

// findCategories(seedJSON)
//     .then(function(tagCategoryIds) {
//         return Promise.all([
//             findUnmatchedCategories(tagCategoryIds),
//             tagCategoryIds
//         ])
//     })
//     .spread(function(unMatchedIds, tagCategoryIds) {
//         console.log("unMatchedIds", unMatchedIds);
//         console.log("tagCategoryIds", tagCategoryIds);
//         return;
//     })
//     .then(function () {
//         console.log('Successfully seeded categories');
//         process.exit(0);
//     })
//     .catch(function (error) {
//         console.log('Failed to seed categories:', error);
//         process.exit(1);
//     });

findAndUpdateAllCategories(seedJSON)
    .then(function () {
        console.log('Successfull');
        process.exit(0);
    })
    .catch(function (error) {
        console.log('Failed to seed categories:', error);
        process.exit(1);
    });


function findCategory(categoryValue, position) {
    return q.ninvoke(TagCategory, 'findOne', {
            where: {
                or: [
                    {"id": {inq: categoryValue.tagCategory.oldIds}},
                    {"name.fr": categoryValue.tagCategory.name}
                ]
            }
        })
        .then(function (category) {
            if(category) {
                console.log("category found:", category.name.fr);
                category.position = position;
                category.name.fr = categoryValue.tagCategory.name;
                return Promise.npost(category, 'save');
            } else {
                console.log("category not found:", categoryValue.tagCategory.name);
                return {'id': 'NOT FOUND', 'name': 'NOT FOUND'};

            }
        })
        .then(function(tagCategory) {
            return tagCategory.id
        });
}

function findAndUpdateAllCategories(seedJSON) {
    return _.reduce(seedJSON, function(currentPromise, tagC, i) {
        return currentPromise.then(function() {
            console.log("########## processing tagC %s at position", tagC.tagCategory.name, i);
            return findAndUpdateCategory(tagC.tagCategory.name, tagC.tagCategory.oldIds, i)
                .then(function(tagCategoryId) {
                    return findAndUpdateTags(tagC, tagCategoryId);
                })
        })
    }, Promise.resolve())
}

function findAndUpdateCategory(name, oldIds, position) {
    return Promise.ninvoke(TagCategory, 'findOne', {
            where: {
                or: [
                    {"id": {inq: oldIds}},
                    {"name.fr": name}
                ]
            }
        })
        .then(function (category) {
            if(category) {
                console.log("category found:", category.name.fr);
                category.position = position;
                category.name.fr = name;
                return Promise.npost(category, 'save');
            } else {
                var data = {
                    name : {
                        fr: name,
                        en: name
                    },
                    position: position
                };

                return Promise.ninvoke(TagCategory, 'create', data)
            }
        })
        .then(function(tagCategory) {
            return tagCategory.id
        });
}

function findAndUpdateTags(tagCategory, tagCategoryId) {
    return _.reduce(tagCategory.tags, function(currentPromise, tag, i) {
        return currentPromise.then(function() {
            console.log("### tag %s ", tag.name, tag.oldIds[0], i);
            console.log("tagCategoryId", tagCategoryId);
            return Promise.ninvoke(Tag, 'findOne', {where: {"id": tag.oldIds[0]}})
                .then(function(existingtag) {
                    if(existingtag && existingtag.id == tag.oldIds[0]) {
                        console.log("tag found", existingtag.name.fr)
                    } else {
                        console.log("tag not found", tag.name)
                    }
                    return;
                })
        })
    }, Promise.resolve())
}
