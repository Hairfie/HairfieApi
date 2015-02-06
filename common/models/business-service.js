'use strict';

var Promise = require('../../common/utils/Promise');
var UUID = require('uuid');

module.exports = function (BusinessService) {
    BusinessService.beforeCreate = function (next) {
        this.id = this.id || UUID.v4();
        next();
    };

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

    BusinessService.validate('price', function (onError) {
        if (!this.price) return onError();
        console.log("amount:", !this.price.amount);
        console.log("currency", !this.price.currency);
        if(!this.price.amount || !this.price.currency) {
            onError();
        }
    }, {message: 'valid'});

};
