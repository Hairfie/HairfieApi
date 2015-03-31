'use strict';

var Promise = require('../common/utils/Promise');

module.exports = function (program, app) {
    program
        .command('build-search-index')
        .description('Builds the search index')
        .option('--clear', 'Clears index before building it')

        .action(function (options) {
            var SearchEngine = app.models.AlgoliaSearchEngine;

            var promise = Promise();
            if (options.clear) {
                promise = promise.then(function () {
                    console.log('Dropping index');
                    SearchEngine
                        .dropIndex('business')
                        .then(function () {
                            console.log('Defining mappings');
                            return SearchEngine.defineAllSettings();
                        })
                });
            }

            promise
                .then(function () {
                    console.log('Indexing documents');
                    return SearchEngine.indexAll(onProgress);
                })
                .then(onSuccess, onFailure);
        });
};

function onProgress(progress) {
    console.log('Indexed '+progress.done+' document(s)');
}

function onSuccess() {
    process.exit(0);
}

function onFailure(error) {
    console.error(error);
    process.exit(1);
}
