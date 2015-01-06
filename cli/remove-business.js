'use strict';

module.exports = function (program, app) {
    program
        .command('remove-business <businessId>')
        .description('Removes the specified business')
        .action(function (businessId) {
            app.models.Business.destroyById(businessId, function (error) {
                if (error) {
                    console.error(error);
                    process.exit(1);
                }
                process.exit(0);
            });
        });
};
