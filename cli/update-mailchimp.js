'use strict';

module.exports = function (program, app) {
    program
        .command('update-mailchimp')
        .description('Update subscribers, bookings and users to Mailchimp')
        .action(function () {
            return app.models.Mailchimp.updateEverything()
            .then(function(result) {
                console.log("Success");
                process.exit(0);
            })
            .catch(function (error) {
                console.log('Fail', error);
                process.exit(1);
            })
        });
};