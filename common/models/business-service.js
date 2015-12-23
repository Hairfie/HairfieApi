'use strict';

var Promise = require('../../common/utils/Promise');
var Hooks = require('./hooks');
var _ = require('lodash');
var q = require('q');

var priceTableMan = [
    {min: 0 , max: 16},
    {min: 17, max: 29},
    {min: 30, max: 49},
    {min: 50}
];

var priceTableWoman = [
    {min: 0 , max: 24},
    {min: 25, max: 39},
    {min: 40, max: 79},
    {min: 80}
];

var calcPriceLevel = function(array, priceTable) {
    var average = 0;
    var i = 0;
    _.map(array, function(a) {
        average += a;
    });
    average /= array.length;

    for (i = 0; i < priceTable.length; i++) {
        if ((priceTable[i].min || 0) <= parseInt(average) && parseInt(average) <= (priceTable[i].max || Infinity)) {
            return i + 1;
        }
    }
}

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
            position        : this.position || null,
            isManClassicPrice : this.isManClassicPrice || false,
            isWomanClassicPrice : this.isWomanClassicPrice || false
        };
    };

    BusinessService.observe('after save', function (ctx, next) {
        if (ctx.instance) {
            var businessServices = ctx.instance;
            var Business = BusinessService.app.models.Business;

            return q.all([
                    q.ninvoke(Business, 'findById', businessServices.businessId),
                    q.ninvoke(BusinessService, 'find', 
                        {
                            where: 
                            {
                                businessId: businessServices.businessId, 
                                or: [
                                    { isManClassicPrice : true },
                                    { isWomanClassicPrice: true }
                                ]
                            }
                        })
                ])
                .spread(function(business, services) {
                    if (!_.isEmpty(_.where(services, {isWomanClassicPrice: true }))) {
                        business.priceLevel = calcPriceLevel(_.pluck(_.where(services, {isWomanClassicPrice: true }), 'price.amount'), priceTableWoman);
                    }
                    else if (!_.isEmpty(_.where(services, {isManClassicPrice: true }))) {
                        business.priceLevel = calcPriceLevel(_.pluck(_.where(services, {isManClassicPrice: true }), 'price.amount'), priceTableMan);
                    }
                    else {
                        business.priceLevel = null;
                    }
                    return q.ninvoke(business, 'save');
                })
                .then(function () {
                    next();
                })
                .fail(console.log);
            }
        next();
    });

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
