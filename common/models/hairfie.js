'use strict';

var Promise = require('../../common/utils/Promise'),
    Q = require('q'),
    lodash = require('lodash');

module.exports = function (Hairfie) {
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
    Hairfie.validateAsync('pictures', function (onError, onDone) {
        // Check only first picture, bad
        var picture = this.pictures[0];

        Hairfie.getApp(function (_, app) {
            app.models.container.getFile('hairfies', picture, function (_, file) {
                if (!file) onError();
                onDone();
            });
        });

        // var pictures = this.pictures;
        // Hairfie.getApp(function (_, app) {
        //     return Q.all(pictures.map(function(picture) {
        //         return Q.nfcall(app.models.container.getFile, 'hairfies', picture);
        //     }))
        //     .then(function (files) {
        //         console.log(files);
        //         onDone();
        //     })
        //     .fail((function (err) {
        //         onError();
        //     }).bind(this));
        // });
    }, {message: 'should exists'});

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

    Hairfie.prototype.toRemoteObject = function (context) {
        var HairfieLike    = Hairfie.app.models.HairfieLike,
            HairfieComment = Hairfie.app.models.HairfieComment,
            pictures       = this.pictureObjects().map(function (picture) { return picture.toRemoteObject(); });

        var businessMember = Promise.npost(this, 'businessMember').then(function (businessMember) {
            return businessMember && businessMember.toRemoteShortObject(context);
        });

        return {
            id              : this.id,
            picture         : pictures[pictures.length - 1],
            pictures        : pictures,
            price           : this.price,
            tags            : Promise.npost(this, 'tagObjects').then(function (tags) {
                return Promise.map(tags, function (tag) { return tag.toRemoteShortObject(context); });
            }),
            description     : this.description,
            author          : Promise.ninvoke(this.author).then(function (author) {
                return author ? author.toRemoteShortObject(context) : null;
            }),
            business        : Promise.ninvoke(this.business).then(function (business) {
                return business ? business.toRemoteShortObject(context) : null;
            }),
            hairdresser     : businessMember, // NOTE: BC
            businessMember  : businessMember,
            numComments     : Promise.ninvoke(HairfieComment, 'count', {hairfieId: this.id}),
            numLikes        : Promise.ninvoke(HairfieLike, 'count', {hairfieId: this.id}),
            landingPageUrl  : Hairfie.app.urlGenerator.hairfie(this),
            selfMade        : !!this.selfMade,
            displayBusiness : this.displayBusiness(),
            hidden          : this.hidden,
            createdAt       : this.createdAt,
            updatedAt       : this.updatedAt
        };
    };

    Hairfie.prototype.displayBusiness = function(authorId) {
        if (!this.businessId) return Promise(false);

        var businessId = this.businessId;
        return Promise.npost(this, 'author')
            .then(function (user) {
                return !!user && user.isManagerOfBusiness(businessId);
            });
    };

    // Hairfie.prototype.pictureObject = function () {
    //     return this.pictureObjects()[0];
    // };

    Hairfie.prototype.pictureObjects = function () {
        var pictures = !Array.isArray(this.pictures) ? [this.picture] : this.pictures;

        return pictures.map(function (picture) {
            return Picture.fromDatabaseValue(picture, 'hairfies', Hairfie.app);
        });
    };

    Hairfie.prototype.tagObjects = function (callback) {
        if (!Array.isArray(this.tags)) return callback(null, []);
        Hairfie.app.models.Tag.findByIds(this.tags, callback);
    };

    Hairfie.hide = function (req, next) {
        if (!req.user) return next({statusCode: 401});

        Hairfie.findById(req.params.hairfieId, function (error, hairfie) {
            if (error) return next({statusCode: 500});
            if (!hairfie) return next({statusCode: 404});
            if (hairfie.authorId.toString() != req.user.id.toString()) return next({statusCode: 403});
            hairfie.updateAttributes({hidden: true}, function(error, hairfie) {
                if (error) return next({statusCode: 500});
                return next();
            })
        });
    };

    Hairfie.share = function (req, next) {
        var HairfieShare = Hairfie.app.models.HairfieShare;

        if (!req.user) return next({statusCode: 401});

        var networks = [];
        if (req.body.facebook) networks.push('facebook');
        if (req.body.facebookPage) networks.push('facebookPage');

        Promise.ninvoke(Hairfie, 'findById', req.params.hairfieId)
            .then(function (hairfie) {
                if (!hairfie) return next({statusCode: 404});
                if (hairfie.authorId.toString() != req.user.id.toString()) return next({statusCode: 403});

                return [
                    hairfie,
                    Promise.npost(hairfie, 'business')
                ];
            })
            .spread(function (hairfie, business) {
                return [
                    hairfie,
                    business,
                    !!business && req.user.isManagerOfBusiness(business.id)
                ];
            })
            .spread(function (hairfie, business, isManager) {
                var fbPage = req.body.facebookPage;
                if (fbPage && !business) return next({statusCode: 400, message: 'facebookPage: Hairfie has no business'});
                if (fbPage && !isManager) return next({statusCode: 403, message: 'facebookPage: User is not manager'});

                return HairfieShare.share(req.user, hairfie, networks);
            })
            .then(next.bind(null, null), next);
    };

    // set user id from access token
    Hairfie.beforeRemote('create', function (ctx, _, next) {
        ctx.req.body.authorId = ctx.req.accessToken.userId;

        if (ctx.req.body.picture) {
            ctx.req.body.pictures = [ctx.req.body.picture];
            delete ctx.req.body.picture;
        }

        // keep backward compatibility (hairdressers -> business members)
        if (!ctx.req.body.businessMemberId) ctx.req.body.businessMemberId = ctx.req.body.hairdresserId;
        delete ctx.req.body.hairdresserId;

        next();
    });

    function createReviewRequest(hairfie) {
        if (!hairfie.customerEmail || !hairfie.businessId) return Promise(null);

        return Promise.ninvoke(Hairfie.app.models.BusinessReviewRequest, 'create', {
            businessId  : hairfie.businessId,
            hairfieId   : hairfie.id,
            email       : hairfie.customerEmail
        });
    }

    Hairfie.afterCreate = function (next) {
        var Email = Hairfie.app.models.email;

        Q.all([
            Promise.ninvoke(this, 'author'),
            Promise.ninvoke(this, 'business'),
            createReviewRequest(this),
            Promise.ninvoke(this, 'tagObjects')
        ]).spread(function (author, business, reviewRequest, tags) {
            var label = 'New Hairfie';

            if (this.customerEmail) {
                Email.sendHairfie(this, author, business, reviewRequest).fail(console.log);
                label += ' with customerEmail !'
            }

            Email.notifySales(label, {
                'ID'            : this.id,
                'URL'           : Hairfie.app.urlGenerator.hairfie(this),
                'Business'      : business.name,
                'Author'        : author.name,
                'Customer email': this.customerEmail,
                'Tags'          : lodash.map(tags, function(tag) {return tag.name}),
                'Business phone': business.phoneNumber
            }).fail(console.log);
        }.bind(this));

        next();
    }

    Hairfie.remoteMethod('share', {
        description: 'Shares a hairfie on social networks',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}}
        ],
        returns: {arg: 'result', root: true},
        http: { path: '/:hairfieId/share', verb: 'POST' }
    });

    Hairfie.remoteMethod('hide', {
        description: 'Delete the hairfie',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}}
        ],
        http: { path: '/:hairfieId', verb: 'DELETE' }
    });
};
