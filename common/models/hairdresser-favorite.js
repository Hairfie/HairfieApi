'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (HairdresserFavorite) {
    HairdresserFavorite.prototype.toRemoteObject = function () {
        return {
            hairdresser : Promise.ninvoke(this.hairdresser).then(function (hairdresser) {
                return hairdresser ? hairdresser.toRemoteObject() : null;
            }),
            createdAt   : this.createdAt
        };
    };
};
