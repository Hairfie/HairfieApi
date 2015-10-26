'use strict';

module.exports = function (program, app) {
    program
        .command('remove-business-review <businessReviewId>')
        .description('Removes the specified hairfie')
        .action(function (businessReviewId) {
            app.models.BusinessReview.findById(businessReviewId, function (error, businessReview) {
                if (error) {
                    console.error(error);
                    process.exit(1);
                }
                if (!businessReview) {
                    console.error("no hairfie");
                    process.exit(1);
                }
                businessReview.updateAttributes({hidden: true}, function(error, businessReview) {
                    if (error) {
                        console.error(error);
                        process.exit(1);
                    }
                    console.log("BusinessReview deleted", businessReviewId);
                    process.exit(0);
                })
            });
        });
};