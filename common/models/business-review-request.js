'use strict';

var Promise = require('../../common/utils/Promise');
var Hooks = require('./hooks');

module.exports = function (BusinessReviewRequest) {
    Hooks.generateSecretId(BusinessReviewRequest, {length: 64});
    Hooks.updateTimestamps(BusinessReviewRequest);

    BusinessReviewRequest.prototype.toRemoteObject = function (context) {
        return {
            id      : this.id,
            href    : BusinessReviewRequest.app.urlGenerator.api('businessReviewRequests/'+this.id),
            business: Promise.npost(this, 'business').then(function (business) {
                return business && business.toRemoteShortObject(context);
            }),
            hairfie : Promise.npost(this, 'hairfie').then(function (hairfie) {
                return hairfie && hairfie.toRemoteShortObject(hairfie);
            }),
            // booking : Promise.npost(this, 'booking').then(function (booking) {
            //     return booking && booking.toRemoteShortObject(booking);
            // }),
            email   : this.email,
            canWrite: this.canWrite(),
            used    : !!this.reviewId
        };
    };

    BusinessReviewRequest.prototype.canWrite = function () {
        return !this.reviewId;
    };
};
