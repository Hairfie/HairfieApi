'use strict';

var Promise = require('../../common/utils/Promise');
var Hooks = require('./hooks');

module.exports = function (BusinessService) {
    Hooks.generateId(BusinessService);
    Hooks.updateTimestamps(BusinessService);

    BusinessService.prototype.toRemoteObject = function (context) {
        return {
            id              : this.id,
            href            : BusinessService.app.urlGenerator.api('businessServices/'+this.id),
            business        : Promise.npost(this, 'business').then(function (business) {
                return business ? business.toRemoteShortObject(context) : null;
            }),
            businessId      : this.businessId,
            gender          : this.gender || "",
            label           : this.label,
            price           : this.price,
            durationMinutes : this.durationMinutes,
            position        : this.position || null
        };
    };

    BusinessService.validateAsync('businessId', function (onError, onDone) {
        if (!this.businessId) return;
        this.business(function (error, business) {
            if (error || !business) onError();
            onDone();
        });
    }, {message: 'exists'});

    BusinessService.validate('price', function (onError) {
        if (!this.price) return onError();
        console.log("amount:", !this.price.amount);
        console.log("currency", !this.price.currency);
        if(!this.price.amount || !this.price.currency) {
            onError();
        }
    }, {message: 'valid'});

};
