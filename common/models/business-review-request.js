'use strict';

var uid = require('uid2');
var Promise = require('../../common/utils/Promise');

module.exports = function (BusinessReviewRequest) {
    var ID_LENGTH = 64;

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
            email   : this.email,
            canWrite: this.canWrite(),
            used    : !!this.reviewId
        };
    };

    BusinessReviewRequest.prototype.canWrite = function () {
        return !this.reviewId;
    };

    BusinessReviewRequest.beforeCreate = function (next) {
        uid(ID_LENGTH, function (error, id) {
            if (error) next(error);
            else {
                this.id = id;
                next();
            }
        }.bind(this));
    };
};
