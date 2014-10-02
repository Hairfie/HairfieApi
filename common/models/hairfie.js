'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (Hairfie) {

    Hairfie.prototype.toRemoteObject = function () {
        var HairfieLike    = Hairfie.app.models.HairfieLike,
            HairfieComment = Hairfie.app.models.HairfieComment;

        return {
            id           : this.id,
            picture      : Picture.fromDatabaseValue(this.picture, 'hairfies', Hairfie.app).toRemoteObject(),
            price        : this.price,
            description  : this.description,
            authorString : this.authorString,
            author       : Promise.ninvoke(this.author).then(function (author) {
                return author ? author.toRemoteShortObject() : null;
            }),
            business     : Promise.ninvoke(this.business).then(function (business) {
                return business ? business.toRemoteShortObject() : null;
            }),
            numComments  : Promise.ninvoke(HairfieComment, 'count', {hairfieId: this.id}),
            numLikes     : Promise.ninvoke(HairfieLike, 'count', {hairfieId: this.id}),
            createdAt    : this.createdAt,
            updatedAt    : this.updatedAt,
        };
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
        if (!this.businessId) return onDone(); // business is optional

        this.business(function (error, business) {
            if (error || !business) onError();
            onDone();
        });
    }, {message: 'exists'});

    // set user id from access token
    Hairfie.beforeRemote('create', function (ctx, _, next) {
        ctx.req.body.authorId = ctx.req.accessToken.userId;
        next();
    });
};
