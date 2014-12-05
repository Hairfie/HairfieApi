'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (BusinessService) {
    BusinessService.prototype.toRemoteObject = function (context) {
        return {
            business        : Promise.npost(this, 'business').then(function (business) {
                return business ? business.toRemoteShortObject(context) : null;
            }),
            service         : Promise.npost(this, 'service').then(function (service) {
                return service ? service.toRemoteShortObject(context) : null;
            }),
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
    BusinessService.validateAsync('serviceId', function (onError, onDone) {
        if (!this.serviceId) return;
        this.service(function (error, service) {
            if (error || !service) onError();
            onDone();
        });
    }, {message: 'exists'});
};
