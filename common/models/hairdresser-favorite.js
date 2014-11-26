'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (HairdresserFavorite) {
    HairdresserFavorite.validateAsync('hairdresserId', function (onError, onDone) {
        this.hairdresser(function (error, hairdresser) {
            if (error || !hairdresser) onError();
            onDone();
        });
    }, {message: 'exists'});
    HairdresserFavorite.validateAsync('userId', function (onError, onDone) {
        this.user(function (error, user) {
            if (error || !user) onError();
            onDone();
        });
    }, {message: 'exists'});

    HairdresserFavorite.prototype.toRemoteObject = function () {
        return {
            hairdresser : Promise.ninvoke(this.hairdresser).then(function (hairdresser) {
                return hairdresser ? hairdresser.toRemoteObject() : null;
            }),
            createdAt   : this.createdAt
        };
    };
};
