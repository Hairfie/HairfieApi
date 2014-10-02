'use strict';

var md5 = require('MD5');
var Promise = require('../../common/utils/Promise');
var Q = require('q');

module.exports = function(User) {
    User.prototype.toRemoteObject = function () {
        var user = this.toRemoteShortObject();

        user.language   = this.language;
        user.newsletter = this.newsletter;
        user.accessToken = this.accessToken;

        return user;
    };

    User.prototype.toRemoteShortObject = function () {
        var Hairfie     = User.app.models.Hairfie,
            numHairfies = Promise.ninvoke(Hairfie, 'count', {authorId: this.id}),
            picture     = Picture.fromDatabaseValue(this.picture, 'user-profile-pictures', User.app);

        return {
            id          : this.id,
            gender      : this.gender,
            firstName   : this.firstName,
            lastName    : this.lastName,
            picture     : picture ? picture.toRemoteObject() : null,
            phoneNumber : this.phoneNumber,
            email       : this.email,
            numHairfies : numHairfies
        };
    };

    User.validatesInclusionOf('gender', {in: ['male', 'female']});

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
          gender: gender,
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
            callback(null, null);
        });
    };

    User.likeHairfie = function (userId, hairfieId, callback) {
        var HairfieLike = User.app.models.HairfieLike,
            likeData    = {userId: userId, hairfieId: hairfieId};

        HairfieLike.findOrCreate({where: likeData}, likeData, function (error, like) {
            if (error) return callback(error);
            callback(null, null);
        });
    };

    User.unlikeHairfie = function (userId, hairfieId, callback) {
        var HairfieLike = User.app.models.HairfieLike;

        HairfieLike.remove({userId: userId, hairfieId: hairfieId}, function (error, _) {
            if (error) return callback(error);
            callback(null, null);
        });
    };

    User.managedBusinesses = function (userId, callback) {
        var BusinessClaim = User.app.models.BusinessClaim;

        User.findById(userId, function (error, user) {
            if (error) return callback(error)
            if (!user) return callback({statusCode: 404});

            Business.find({ownerId: user.id}, function (error, businesses) {
                if (error) return callback(error);
                callback(null, businesses);
            });
        });
    };

    User.beforeRemote(['likedHairfie', 'likedHairfies', 'likeHairfie', 'unlikeHairfie'], function (ctx, _, next) {
        var accessToken = ctx.req.accessToken;
        if (!accessToken) return next('You must be logged in.');
        if (!accessToken.userId != ctx.req.params.userId) return next('User mismatch');
        next();
    });

    User.remoteMethod('likedHairfie', {
        description: 'Returns a hairfie liked by the user (or 404 if not liked)',
        accepts: [
            {arg: 'userId', type: 'String', required: true, description: 'Identifier of the user'},
            {arg: 'hairfieId', type: 'String', required: true, description: 'Identifier of the hairfie'}
        ],
        returns: {arg: 'hairfie', root: true},
        http: { path: '/:userId/liked-hairfies/:hairfieId', verb: 'HEAD' }
    });
    User.remoteMethod('getHairfieLikes', {
        description: 'List of hairfies liked by the user',
        accepts: [
            {arg: 'userId', type: 'String', required: true, description: 'Identifier of the user'},
            {arg: 'until', type: 'Date', description: 'Ignore hairfies liked after this date'},
            {arg: 'limit', type: 'Number', description: 'Maximum number of hairfies to return'},
            {arg: 'skip', type: 'Number', description: 'Number of hairfies to skip'}
        ],
        returns: {arg: 'hairfies', root: true},
        http: { path: '/:userId/liked-hairfies', verb: 'GET' }
    });
    User.remoteMethod('likeHairfie', {
        description: 'Like a hairfie',
        accepts: [
            {arg: 'userId', type: 'String', required: true, description: 'Identifier of the user'},
            {arg: 'hairfieId', type: 'String', required: true, description: 'Identifier of the hairfie'},
        ],
        http: { path: '/:userId/liked-hairfies/:hairfieId', verb: 'PUT' }
    });
    User.remoteMethod('unlikeHairfie', {
        description: 'Unlike a hairfie',
        accepts: [
            {arg: 'userId', type: 'String', required: true, description: 'Identifier of the user'},
            {arg: 'hairfieId', type: 'String', required: true, description: 'Identifier of the hairfie'},
        ],
        http: { path: '/:userId/liked-hairfies/:hairfieId', verb: 'DELETE' }
    });
    User.remoteMethod('managedBusinesses', {
        description: 'Gets the businesses managed by the user',
        accepts: [
            {arg: 'userId', type: 'String', required: true, description: 'Identifier of the user'}
        ]
    });
}
