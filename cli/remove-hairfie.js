'use strict';
var Promise = require('../common/utils/Promise');

module.exports = function (program, app) {
    program
        .command('remove-hairfie <hairfieId>')
        .description('Removes the specified hairfie')
        .action(function (hairfieId) {
            app.models.Hairfie.findById(hairfieId, function (error, hairfie) {
                if (error) {
                    console.error(error);
                    process.exit(1);
                }
                if (!hairfie) {
                    console.error("no hairfie");
                    process.exit(1);
                }
                return Promise.npost(hairfie, 'delete')
                    .then(function() {
                        console.log("Hairfie deleted", hairfieId);
                        process.exit(0);
                    })
                    .fail(function(e) {
                        console.log("error", e);
                        process.exit(1);
                    })
                // hairfie.updateAttributes({hidden: true}, function(error, hairfie) {
                //     if (error) {
                //         console.error(error);
                //         process.exit(1);
                //     }
                //     console.log("Hairfie deleted", hairfieId);
                //     process.exit(0);
                // })
            });
        });
};