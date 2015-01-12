'use strict';

var uid = require('uid2');

module.exports = function (BusinessReviewRequest) {
    var ID_LENGTH = 64;

    BusinessReviewRequest.prototype.toRemoteObject = function (context) {
        return {
            id      : this.id,
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
