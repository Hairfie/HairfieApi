'use strict';

var Promise = require('../common/utils/Promise');

module.exports = function (program, app) {
    program
        .command('save-all-businesses')
        .description('Save all existing')
        .action(function () {
            var Business = app.models.Business;
            var BusinessMember = app.models.BusinessMember;

            return Promise.ninvoke(BusinessMember, 'find', {limit: 1})
                .then(function(result) {
                    var collection = BusinessMember.dataSource.connector.collection(BusinessMember.definition.name);
                    return Promise.ninvoke(collection, 'distinct', 'businessId');
                })
                .then(function(ids) {
                    return Promise.ninvoke(Business, 'findByIds', ids);
                })
                .then(function(businesses) {
                    console.log("businesses", businesses.length);
                    return Promise.all(businesses.map(function(b) {
                        return Promise.npost(b, 'save');
                    }));
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