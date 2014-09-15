'use strict';

var md5 = require('MD5');
var Promise = require('../../common/utils/Promise');
var Q = require('q');

module.exports = function(User) {
    User.prototype.toRemoteObject = function () {
        var self = this;

        return self.toRemoteShortObject()
            .then(function (user) {
                console.log(user);
                user.newsletter = self.newsletter;

                return user;
            });
    };

    User.prototype.toRemoteShortObject = function () {
        var Hairfie     = User.app.models.Hairfie,
            numHairfies = Promise.ninvoke(Hairfie, 'count', {authorId: this.id});

        return {
            id          : this.id,
            gender      : this.gender,
            firstName   : this.firstName,
            lastName    : this.lastName,
            picture     : User.getPictureObj(this),
            numHairfies : numHairfies
        };
    };

    User.validatesInclusionOf('gender', {in: ['male', 'female']});

    User.beforeSave = function(next, user) {
        if (!user.picture) user.picture =  'http://www.gravatar.com/avatar/' + md5(user.email);
        next();
    }

    User.afterSave = function (next) {
        var user = this;

        Promise.denodeify(User.getApp.bind(User))()
            .then(function (app) {
                return app.models.email.welcomeUser(user)
            })
            .catch(console.log)
            .then(function() { next() }, next)
        ;
    }

    User.afterCreate = function (next) {
        var user = this;
        user.createAccessToken(null, function (error, token) {
            user.token = token;
            next();
        });
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

    User.getPictureObj = function (user) {
        if (user.picture && user.picture.indexOf('http') == 0) {
            return {publicUrl: user.picture};
        }

        var picture = new Picture(user.picture, 'user-profile-pictures', User.app.get('url'));

        return picture.publicObject();
    };

    User.likedHairfies = function (userId, limit, skip, callback) {
        var Hairfie = User.app.models.Hairfie;

        User.findById(userId, function (error, user) {
            if (error) return callback(error);

            Hairfie.likedByUser(user, limit, skip, function (error, hairfies) {
                if (error) return callback(error);
                callback(null, hairfies);
            });
        });
    };

    User.likeHairfie = function (userId, hairfieId, callback) {
        var HairfieLike = User.app.models.HairfieLike,
            likeData    = {userId: userId, hairfieId: hairfieId};

        HairfieLike.findOrCreate({where: likeData}, likeData, function (error, like) {
            if (error) return callback(error);
            like.save(function (error, _) {
                if (error) return callback(error);
                callback(null, null);
            });
        });
    };

    User.unlikeHairfie = function (userId, hairfieId, callback) {
        var HairfieLike = User.app.models.HairfieLike;

        HairfieLike.remove({userId: userId, hairfieId: hairfieId}, function (error, _) {
            if (error) return callback(error);
            callback(null, null);
        });
    };

    User.beforeRemote(['likedHairfies', 'likeHairfie', 'unlikeHairfie'], function (ctx, _, next) {
        var accessToken = ctx.req.accessToken;
        if (!accessToken) return next('You must be logged in.');
        if (!accessToken.userId != ctx.req.params.userId) return next('User mismatch');
        next();
    });

    User.remoteMethod('likedHairfies', {
        description: 'List of hairfies liked by the user',
        accepts: [
            {arg: 'userId', type: 'String', required: true, description: 'Identifier of the user'},
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
}
