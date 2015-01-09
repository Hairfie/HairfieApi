'use strict';

var uid = require('uid2');

module.exports = function (BusinessReviewToken) {
    var ID_LENGTH = 64;

    BusinessReviewToken.prototype.toRemoteObject = function (context) {
        return {
            id      : this.id,
            canWrite: this.canWrite(),
            used    : !!this.reviewId
        };
    };

    BusinessReviewToken.prototype.canWrite = function () {
        return !this.reviewId;
    };

    BusinessReviewToken.beforeCreate = function (next) {
        var token = this;
        uid(ID_LENGTH, function (error, id) {
            if (error) next(error);
            else {
                token.id = id;
                next();
            }
        });
    };
};
