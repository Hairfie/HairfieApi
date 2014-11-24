'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (BusinessFavorite) {
    BusinessFavorite.prototype.toRemoteObject = function () {
        return {
            business    : Promise.ninvoke(this.business).then(function (business) {
                return business ? business.toRemoteObject() : null;
            }),
            createdAt   : this.createdAt
        };
    };
};
