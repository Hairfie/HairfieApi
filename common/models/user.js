'use strict';

var md5 = require('MD5');
var Promise = require('../../common/utils/Promise');
var Q = require('q');
var _ = require('lodash');


module.exports = function(User) {
    User.GENDER_MALE = 'MALE';
    User.GENDER_FEMALE = 'FEMALE';

    User.prototype.equals = function (user) {
        return this.id && user && this.id.toString() == user.id.toString();
    };

    User.prototype.toRemoteObject = function (context) {
        var user = this.toRemoteShortObject();

        if (!this.equals(context.getUser())) {
            return user;
        }

        user.phoneNumber = this.phoneNumber;
        user.email = this.email;
        user.language   = this.language;
        user.newsletter = this.newsletter;
        user.accessToken = this.accessToken;

        return user;
    };

    User.prototype.toRemoteShortObject = function (context) {
        var Hairfie             = User.app.models.Hairfie,
            BusinessReview      = User.app.models.BusinessReview,
            numHairfies         = Promise.ninvoke(Hairfie, 'count', {authorId: this.id}),
            numBusinessReviews  = Promise.ninvoke(BusinessReview, 'count', {authorId: this.id}),
            picture             = Picture.fromDatabaseValue(this.picture, 'user-profile-pictures', User.app);

        return {
            id                  : this.id,
            gender              : this.gender,
            firstName           : this.firstName,
            lastName            : this.lastName,
            picture             : picture ? picture.toRemoteObject() : null,
            numHairfies         : numHairfies,
            numBusinessReviews  : numBusinessReviews
        };
    };

    User.prototype.isManagerOfBusiness = function (businessId) {
        var deferred = Q.defer();
        var BusinessMember = User.app.models.BusinessMember;
        var where = {};
        where.userId = this.id;
        where.businessId = businessId;
        where.active = true;

        BusinessMember.findOne({where: where}, function (error, bm) {
            if (error) deferred.reject(error);
            deferred.resolve(!!bm);
        });

        return deferred.promise;
    };

    User.validatesInclusionOf('gender', {in: [User.GENDER_MALE, User.GENDER_FEMALE]});

    User.afterCreate = function (next) {
        var user = this;

        Promise.denodeify(User.getApp.bind(User))()
            .then(function (app) {
                return app.models.email.welcomeUser(user)
            })
            .then(function () {
                var deferred = Q.defer();
                user.createAccessToken(null, function (error, token) {
                    user.accessToken = {
                        id: token.id,
                        ttl: token.ttl
                    };
                    deferred.resolve();
                });
                return deferred.promise;
            })
            .catch(console.log)
            .then(function() {
                next();
            }, next)
        ;

    }

    User.afterIdentityCreate = function (identity, next) {
        if (identity.profile.provider != 'facebook') return next();
        identity.user(function (error, user) {
            if (error) return next(error);
            if (!user) return next('Identity\'s user not found');

            user.facebookId = identity.externalId;
            user.save(next);
        });
    };

    User.profileToUser = function(provider, profile) {
        // Let's create a user for that
        var email = profile.emails && profile.emails[0] && profile.emails[0].value;
        if (!email) {
            // Fake an e-mail
            email = (profile.username || profile.id) + '@hairfie.'
            + (profile.provider || provider) + '.com';
          }
        var username = provider + '.' + (profile.username || profile.id);
        var password = "temporary";
        var gender = profile.gender;

        var userObj = {
          username: username,
          password: password,
          email: email,
          firstName: profile.name && profile.name.givenName,
          lastName: profile.name && profile.name.familyName,
          gender: gender ? gender.toUpperCase() : null,
          picture: "http://graph.facebook.com/" + profile.id + '/picture'
        };
        return userObj;
    }

    User.on('resetPasswordRequest', function (info) {
        var user = info.user;
        var resetPath =  "#/reset-password?token="+ info.accessToken.id + "&uid=" + info.user.id;

        User.getApp(function (error, app) {
            var resetUrl = app.get('url') + resetPath;
            console.log(resetUrl);
            app.models.email.resetUserPassword(user, resetUrl);
        });
    });

    User.prototype.getFullEmail = function () {
        return this.getFullName()+ ' <'+this.email+'>';
    };

    User.prototype.getFullName = function () {
        return this.firstName+' '+this.lastName;
    };

    User.getHairfieLikes = function (userId, until, limit, skip, callback) {
        var limit       = Math.min(limit || 10, 50),
            skip        = skip || 0,
            HairfieLike = User.app.models.HairfieLike

        User.findById(userId, function (error, user) {
            if (error) return callback(error);
            if (!user) return callback({statusCode: 404});

            var filter = {where: {userId: user.id}, order: 'createdAt DESC', limit: limit, skip: skip};
            if (until) filter.where.createdAt = {lte: until};

            HairfieLike.find(filter, callback);
        });
    };

    User.likedHairfie = function (userId, hairfieId, callback) {
        var HairfieLike = User.app.models.HairfieLike,
            likeData    = {userId: userId, hairfieId: hairfieId};

        HairfieLike.findOne({where: likeData}, function (error, like) {
            if (error) return callback(error);
            if (!like) return callback({statusCode: 404});
            callback();
        });
    };

    User.likeHairfie = function (userId, hairfieId, callback) {
        var HairfieLike = User.app.models.HairfieLike,
            likeData    = {userId: userId, hairfieId: hairfieId};

        HairfieLike.findOrCreate({where: likeData}, likeData, function (error) {
            if (error) return callback(error);
            callback(null, null);
        });
    };

    User.unlikeHairfie = function (userId, hairfieId, callback) {
        var HairfieLike = User.app.models.HairfieLike;

        HairfieLike.remove({userId: userId, hairfieId: hairfieId}, function (error) {
            if (error) return callback(error);
            callback(null, null);
        });
    };

    User.isFavoriteHairdresser = function (userId, hairdresserId, callback) {
        var HairdresserFavorite = User.app.models.HairdresserFavorite,
            favoriteData        = {userId: userId, hairdresserId: hairdresserId};

        HairdresserFavorite.findOne({where: favoriteData}, function (error, favorite) {
            if (error) return callback(error);
            if (!favorite) return callback({statusCode: 404});
            callback();
        });
    };
    User.getFavoriteHairdressers = function (userId, until, limit, skip, callback) {
        var limit               = Math.min(limit || 10, 50),
            skip                = skip || 0,
            HairdresserFavorite = User.app.models.HairdresserFavorite;

        User.findById(userId, function (error, user) {
            if (error) return callback(error);
            if (!user) return callback({statusCode: 404});

            var filter = {where: {userId: user.id}, order: 'createdAt DESC', limit: limit, skip: skip};
            if (until) filter.where.createdAt = {lte: until};

            HairdresserFavorite.find(filter, callback);
        });
    };
    User.favoriteHairdresser = function (userId, hairdresserId, callback) {
        var HairdresserFavorite = User.app.models.HairdresserFavorite,
            favoriteData        = {userId: userId, hairdresserId: hairdresserId};

        HairdresserFavorite.findOrCreate({where: favoriteData}, favoriteData, function (error) {
            if (error) return callback(error);
            callback(null, null);
        });
    };
    User.unfavoriteHairdresser = function (userId, hairdresserId, callback) {
        var HairdresserFavorite = User.app.models.HairdresserFavorite,
            favoriteData        = {userId: userId, hairdresserId: hairdresserId};

        HairdresserFavorite.remove(favoriteData, function (error) {
            if (error) return callback(error);
            callback(null, null);
        });
    };

    User.managedBusinesses = function (userId, callback) {
        var Business       = User.app.models.Business,
            BusinessMember = User.app.models.BusinessMember;

        BusinessMember.find({where: {userId: userId}}, function (error, bms) {
            if (error) return callback(error);

            var ids = bms.map(function (bm) { return bm.businessId; });

            Business.findByIds(ids, callback);
        });
    };

    User.query = function (q, cb) {
        var collection = User.dataSource.connector.collection(User.definition.name);

        var pipe = [];
        pipe.push({$match: {$text: {$search: q}}});
        pipe.push({$project: {_id: true}});
        pipe.push({$sort: {score: {$meta: "textScore"}}});

        collection.aggregate(pipe, function (error, results) {
            if (error) return cb(error);

            var ids = results.map(function (r) { return r._id});
            User.findByIds(ids, cb);
        });
    };

    function loggedInAsSubjectUser(ctx, _, next) {
        var accessToken = ctx.req.accessToken;
        console.log("accessToken", accessToken);
        if (!accessToken) return next({statusCode: 401});
        if (accessToken.userId.toString() != ctx.req.params.id.toString()) return next({statusCode: 403});
        next();
    }

    User.beforeRemote('findById', loggedInAsSubjectUser);
    User.beforeRemote('*.updateAttributes', loggedInAsSubjectUser);

    User.beforeRemote(['likedHairfie', 'likedHairfies', 'likeHairfie', 'unlikeHairfie', 'isHairdresserFavorite', 'favoriteHairdressers', 'favoriteHairdresser', 'unfavoriteHairdresser'], function (ctx, _, next) {
        var accessToken = ctx.req.accessToken;
        if (!accessToken) return next({statusCode: 401});
        if (!accessToken.userId != ctx.req.params.userId) return next({statusCode: 403});
        next();
    });

    User.afterRemote('create', function (ctx, _, next) {
        ctx.res.status(201);
        next();
    });

    User.remoteMethod('query', {
        description: 'Returns users list',
        accepts: [
            {arg: 'q', type: 'string', required: true, description: 'Fulltext search query'}
        ],
        returns: {arg: 'users', root: true},
        http: { path: '/', verb: 'GET' }
    });
    User.remoteMethod('likedHairfie', {
        description: 'Returns a hairfie liked by the user (or 404 if not liked)',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'},
            {arg: 'hairfieId', type: 'string', required: true, description: 'Identifier of the hairfie'}
        ],
        http: { path: '/:userId/liked-hairfies/:hairfieId', verb: 'HEAD' }
    });
    User.remoteMethod('getHairfieLikes', {
        description: 'List of hairfies liked by the user',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'},
            {arg: 'until', type: 'string', description: 'Ignore hairfies liked after this date'},
            {arg: 'limit', type: 'number', description: 'Maximum number of hairfies to return'},
            {arg: 'skip', type: 'number', description: 'Number of hairfies to skip'}
        ],
        returns: {arg: 'hairfies', root: true},
        http: { path: '/:userId/liked-hairfies', verb: 'GET' }
    });
    User.remoteMethod('likeHairfie', {
        description: 'Like a hairfie',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'},
            {arg: 'hairfieId', type: 'string', required: true, description: 'Identifier of the hairfie'},
        ],
        http: { path: '/:userId/liked-hairfies/:hairfieId', verb: 'PUT' }
    });
    User.remoteMethod('unlikeHairfie', {
        description: 'Unlike a hairfie',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'},
            {arg: 'hairfieId', type: 'string', required: true, description: 'Identifier of the hairfie'},
        ],
        http: { path: '/:userId/liked-hairfies/:hairfieId', verb: 'DELETE' }
    });
    User.remoteMethod('isFavoriteHairdresser', {
        description: 'Indicates if a hairdresser is one of the user\'s favorites (or 404 if not liked)',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'},
            {arg: 'hairdresserId', type: 'string', required: true, description: 'Identifier of the hairdresser'}
        ],
        http: { path: '/:userId/favorite-hairdressers/:hairdresserId', verb: 'HEAD' }
    });
    User.remoteMethod('getFavoriteHairdressers', {
        description: 'List of user\'s favorite hairdressers',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'},
            {arg: 'until', type: 'string', description: 'Ignore hairdressers favorited after this date'},
            {arg: 'limit', type: 'number', description: 'Maximum number of hairdressers to return'},
            {arg: 'skip', type: 'number', description: 'Number of hairdressers to skip'}
        ],
        returns: {arg: 'businesses', root: true},
        http: { path: '/:userId/favorite-hairdressers', verb: 'GET' }
    });
    User.remoteMethod('favoriteHairdresser', {
        description: 'Favorites a hairdresser',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'},
            {arg: 'hairdresserId', type: 'string', required: true, description: 'Identifier of the hairdresser'},
        ],
        http: { path: '/:userId/favorite-hairdressers/:hairdresserId', verb: 'PUT' }
    });
    User.remoteMethod('unfavoriteHairdresser', {
        description: 'Unfavorite a hairdresser',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'},
            {arg: 'hairdresserId', type: 'string', required: true, description: 'Identifier of the hairdresser'},
        ],
        http: { path: '/:userId/favorite-hairdressers/:hairdresserId', verb: 'DELETE' }
    });
    User.remoteMethod('managedBusinesses', {
        description: 'Gets the businesses managed by the user',
        accepts: [
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user'}
        ],
        returns: {arg: 'businesses', root: true},
        http: { path: '/:userId/managed-businesses', verb: 'GET' }
    });
}
