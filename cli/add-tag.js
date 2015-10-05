'use strict';
var Q = require('q');

module.exports = function (program, app) {
    program
        .command('add-tag <tagName>')
        .option('-t, --tagCategory <tagCategory>', 'specify the tagCategory', 'Service')
        .description('Add the tag')
        .action(function (tagName, options) {
            var tagCategoryName = options.tagCategory;

            var TagCategory = app.models.TagCategory;
            var Tag = app.models.Tag;

            return Q.ninvoke(TagCategory, 'find', {where: {"name.fr": tagCategoryName}})
            .then(function(tagCategories) {
                return [
                    tagCategories[0],
                    Q.ninvoke(Tag, 'count', {categoryId: tagCategories[0].id}),
                ]
            })
            .spread(function(tagCategory, position) {
                var data = {
                    name : {
                        fr: tagName,
                        en: tagName
                    },
                    position: position,
                    categoryId: tagCategory.id
                };
                console.log("data", data);

                return Q.ninvoke(Tag, 'create', data)
            })
            .then(function(result) {
                console.log("success : ", result.length);

                process.exit(0);
            })
            .catch(function (error) {
                console.log('Fail', error);
                process.exit(1);
            })
        });
};