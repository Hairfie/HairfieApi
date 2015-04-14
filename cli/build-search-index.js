'use strict';

var Q = require('q');
var _ = require('lodash');

function collect(val, memo) {
    memo.push(val);
    return memo;
}

module.exports = function (program, app) {
    program
        .command('build-search-index [indices...]')
        .description('Builds the search index')
        .option('-c, --clear', 'Clears index before building it')
        .action(function (indices, options) {
            buildIndexes(app, indices, !!options.clear)
                .then(onSuccess, onFailure);
        });
};

function buildIndexes(app, indexes, clear) {
    if (indexes.length == 0) return Q();

    return buildIndex(app, _.first(indexes), clear)
        .then(function () {
            return buildIndexes(app, _.rest(indexes), clear);
        });
};

function buildIndex(app, index, clear) {
    console.log('----> Index:', index);

    var SearchEngine = app.models.AlgoliaSearchEngine;

    var promise = Q();

    if (clear) {
        promise = promise
            .then(function () {
                console.log('Dropping index');
                return SearchEngine.dropIndex(index);
            })
            .then(function () {
                console.log('Creating index');
                return SearchEngine.configureIndex(index);
            });
    }

    return promise
        .then(function () {
            console.log('Indexing documents');
            return SearchEngine.indexAll(index, onProgress);
        });
}

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
