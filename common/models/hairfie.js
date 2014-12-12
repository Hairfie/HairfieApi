'use strict';

var Promise = require('../../common/utils/Promise'),
    Q = require('q'),
    _ = require('lodash');

module.exports = function (Hairfie) {
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
    Hairfie.validateAsync('tags', function (onError, onDone) {
        if (!Array.isArray(this.tags) || 0 == this.tags.length) return onDone();

        this.tagObjects((function (error, tags) {
            if (tags.length != this.tags.length) return onError();
            onDone();
        }).bind(this));
    }, {message: 'all exist'});
    //Hairfie.validateAsync('hairdresserId', function (onError, onDone) {
    //    if (!this.hairdresserId) return onDone();
    //    this.hairdresser((function (error, hairdresser) {
    //        if (error || !hairdresser) return onError();
    //        if (hairdresser.businessId.toString() != this.businessId.toString()) onError();
    //        onDone();
    //    }).bind(this));
    //}, {message: 'exists & belongs to business'});

    Hairfie.prototype.toRemoteObject = function (context) {
        var HairfieLike    = Hairfie.app.models.HairfieLike,
            HairfieComment = Hairfie.app.models.HairfieComment;

        return {
            id              : this.id,
            picture         : this.pictureObject().toRemoteObject(),
            price           : this.price,
            tags            : Promise.npost(this, 'tagObjects').then(function (tags) {
                return Promise.map(tags, function (tag) { return tag.toRemoteShortObject(context); });
            }),
            description     : this.description,
            hairdresserName : this.hairdresserName,
            author          : Promise.ninvoke(this.author).then(function (author) {
                return author ? author.toRemoteShortObject(context) : null;
            }),
            business        : Promise.ninvoke(this.business).then(function (business) {
                return business ? business.toRemoteShortObject(context) : null;
            }),
            hairdresser     : Promise.npost(this, 'hairdresser').then(function (hairdresser) {
                return hairdresser ? hairdresser.toRemoteShortObject(context) : null;
            }),
            numComments     : Promise.ninvoke(HairfieComment, 'count', {hairfieId: this.id}),
            numLikes        : Promise.ninvoke(HairfieLike, 'count', {hairfieId: this.id}),
            landingPageUrl  : Hairfie.app.urlGenerator.hairfie(this),
            selfMade        : !!this.selfMade,
            displayBusiness : this.displayBusiness(),
            createdAt       : this.createdAt,
            updatedAt       : this.updatedAt,
        };
    };

    Hairfie.prototype.displayBusiness = function(authorId) {
        if (!this.businessId) return Promise(false);

        var businessId = this.businessId;
        return Promise.npost(this, 'author')
            .then(function (user) {
                return user ? user.isManagerOfBusiness(businessId) : Promise(null);
            });
    };

    Hairfie.prototype.pictureObject = function () {
        return Picture.fromDatabaseValue(this.picture, 'hairfies', Hairfie.app);
    };

    Hairfie.prototype.tagObjects = function (callback) {
        if (!Array.isArray(this.tags)) return callback(null, []);
        Hairfie.app.models.Tag.findByIds(this.tags, callback);
    };

    Hairfie.share = function (req, next) {
        var HairfieShare = Hairfie.app.models.HairfieShare;

        if (!req.user) return next({statusCode: 401});

        var networks = [];
        if (req.body.facebook) {
            networks.push('facebook');
        }

        Hairfie.findById(req.params.hairfieId, function (error, hairfie) {
            if (error) return next({statusCode: 500});
            if (!hairfie) return next({statusCode: 404});
            if (hairfie.authorId.toString() != req.user.id.toString()) return next({statusCode: 403});

            HairfieShare.share(req.user, hairfie, networks).then(next.bind(null, null), next);
        });
    };

    // set user id from access token
    Hairfie.beforeRemote('create', function (ctx, _, next) {
        ctx.req.body.authorId = ctx.req.accessToken.userId;
        next();
    });

    Hairfie.afterCreate = function (next) {
        var hairfie = this;
        if(hairfie.customerEmail) {
            Q.all([
                    Promise.denodeify(Hairfie.getApp.bind(Hairfie))(),
                    Promise.ninvoke(hairfie.author).then(function (author) {
                        return author ? author.toRemoteShortObject() : null;
                    })
                ])
                .spread(function (app, author) {
                    var pictureObject = hairfie.pictureObject().toRemoteObject();
                    return app.models.email.sendHairfie(hairfie, pictureObject, author);
                })
                .catch(console.log)
                .then(function() {
                    next();
                }, next)
            ;
        } else {
            next();
        }
    }

    Hairfie.remoteMethod('share', {
        description: 'Shares a hairfie on social networks',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}}
        ],
        returns: {arg: 'result', root: true},
        http: { path: '/:hairfieId/share', verb: 'POST' }
    });
};
