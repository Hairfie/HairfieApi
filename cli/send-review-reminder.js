'use strict';

var Promise = require('../common/utils/Promise');
var moment = require('moment');
moment.locale('fr');

module.exports = function (program, app) {
    program
        .command('send-review-reminder')
        .description('Sends the business review reminder emails')
        .action(function (options) {
            var BusinessReviewRequest = app.models.BusinessReviewRequest;

            var yesterday = moment().subtract(1, 'days').startOf('days').toISOString();

            var where = {
                and: [
                    {reviewId: null},
                    {emailSentAt: {neq: null}},
                    {dateTime: { lte: yesterday }}
                ],
                or: [
                    { reminderSentAt: null },
                    { reminderSentAt: { exists: false } }
                ]
            };
            Promise.ninvoke(BusinessReviewRequest, 'find', {where: where})
                .then(function (requests) {
                    console.log("requests to send", requests.length);
                    return Promise.all(requests.map(sendBusinessReviewRequestReminder.bind(null, app)));
                })
                .then(onSuccess, onFailure);
        });
};

function sendBusinessReviewRequestReminder(app, brr) {
    var Email = app.models.Email;

    console.log('Sending request '+brr.id+' to '+brr.email);

    return Promise.npost(brr, 'business')
        .then(function (business) {
            if (!business) throw new Error("Business not found");
            console.log("EMAIL SHOULD BE SENT TO :", business.name, brr.dateTime);

            return Email.requestBusinessReviewReminder(business, brr);
        })
        .then(function () {
            brr.reminderSentAt = new Date();

            return Promise.npost(brr, 'save');
        })
        .fail(function (error) {
            console.log('Failed to send '+brr.id+':', error);
        });
}

function onSuccess() {
    process.exit(0);
}

function onFailure(error) {
    console.error(error);
    process.exit(1);
}
