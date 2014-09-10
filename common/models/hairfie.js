'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (Hairfie) {
    Hairfie.definition.settings.sharedMethodNames = ['find', 'findById', 'create'];

    Hairfie.prototype.toRemoteObject = function () {
        var self = this,
            app  = Hairfie.app;

        return Promise.spread(
            [
                Promise.ninvoke(app.models.user, 'findById', self.userId),
                Promise.ninvoke(app.models.Business, 'findById', self.businessId)
            ],
            function (user, business) {
                return {
                    id          : self.id,
                    picture     : Hairfie.getPictureObject(self),
                    price       : self.price,
                    description : self.description,
                    user        : user ? user.toRemoteShortObject() : null,
                    business    : business ? business.toRemoteShortObject() : null
                }
            }
        );
    };

    Hairfie.validatesUniquenessOf('picture');
    Hairfie.validate('price', function (onError) {
        // validate structure
        if (undefined == this.price) return;
        if (typeof this.price != 'object') return onError();
        if (undefined == this.price.amount || undefined == this.price.currency) return onError();

        // validate amount
        var amount = parseFloat(this.price.amount);
        if (isNaN(amount) || amount < 0) return onError();

        // validate currency
        if (this.price.currency != 'EUR') return onError();
    });
    Hairfie.validateAsync('picture', function (onError, onDone) {
        var picture = this.picture;

        Hairfie.getApp(function (_, app) {
            app.models.container.getFile('hairfies', picture, function (_, file) {
                if (!file) onError();
                onDone();
            });
        });
    }, {message: 'exists'});
    Hairfie.validateAsync('businessId', function (onError, onDone) {
        var businessId = this.businessId;

        if (undefined == businessId) return onDone();

        Hairfie.getApp(function (_, app) {
            app.models.Business.exists(businessId, function (_, exists) {
                if (!exists) onError();
                onDone();
            });
        });
    }, {message: 'exists'});

    // set user id from access token
    Hairfie.beforeRemote('create', function (ctx, _, next) {
        ctx.req.body.userId = ctx.req.accessToken.userId;
        next();
    });

    Hairfie.getPictureObject = function (hairfie) {
        var picture = new Picture(hairfie.picture, "hairfies", Hairfie.app.get('url'));

        return picture.publicObject();
    };
};
