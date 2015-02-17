'use strict';

var Promise = require('../common/utils/Promise');

module.exports = function (program, app) {
    program
        .command('configure-algolia')
        .description('Configure algolia index settings')

        .action(function (options) {
            var AlgoliaSearchEngine = app.models.AlgoliaSearchEngine;

            var promise = Promise();

            promise
                .then(function () {
                    console.log('Print algolia variables');
                    return AlgoliaSearchEngine.displayInfos();
                })
                .then(function () {
                    console.log('Defining settings');
                    return AlgoliaSearchEngine.defineAllSettings();
                })
                .then(onSuccess, onFailure);
        });
};

function onSuccess() {
    process.exit(0);
}

function onFailure(error) {
    console.error(error);
    process.exit(1);
}
