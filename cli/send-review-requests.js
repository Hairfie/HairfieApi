'use strict';

var Promise = require('../common/utils/Promise');
var moment = require('moment');
moment.locale('fr');

module.exports = function (program, app) {
    program
        .command('send-review-requests')
        .description('Sends the business review request emails')
        .action(function (options) {
            var BusinessReviewRequest = app.models.BusinessReviewRequest;
            var now = moment().tz('Europe/Paris');

            var where = {
                reviewId: null,
                emailSentAt: null,
                dateTime: { lte: now }
            };

            Promise.ninvoke(BusinessReviewRequest, 'find', {where: where})
                .then(function (requests) {
                    console.log("requests to send", requests.length);
                    return Promise.all(requests.map(sendBusinessReviewRequest.bind(null, app)));
                })
                .then(onSuccess, onFailure);
        });
};

function sendBusinessReviewRequest(app, brr) {
    var Email = app.models.Email;

    console.log('Sending request '+brr.id+' to '+brr.email);

    return Promise.npost(brr, 'business')
        .then(function (business) {
            if (!business) throw new Error("Business not found");
            console.log("EMAIL SHOULD BE SENT TO :", business.name, brr.dateTime);

            return Email.requestBusinessReview(business, brr);
        })
        .then(function () {
            brr.emailSentAt = new Date();
            //return
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
