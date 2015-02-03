'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (BusinessService) {
    BusinessService.prototype.toRemoteObject = function (context) {
        return {
            id              : this.id,
            business        : Promise.npost(this, 'business').then(function (business) {
                return business ? business.toRemoteShortObject(context) : null;
            }),
            label           : this.label,
            price           : this.price,
            durationMinutes : this.durationMinutes
        };
    };

    BusinessService.validateAsync('businessId', function (onError, onDone) {
        if (!this.businessId) return;
        this.business(function (error, business) {
            if (error || !business) onError();
            onDone();
        });
    }, {message: 'exists'});

};
