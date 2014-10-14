'use strict';

module.exports = function (Hairdresser) {
    Hairdresser.prototype.toRemoteShortObject = function () {
        return {
            id          : this.id,
            firstName   : this.firstName,
            lastName    : this.lastName,
            email       : this.email,
            phoneNumber : this.phoneNumber,
        };
    };
};
