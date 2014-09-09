'use strict';

var md5 = require('MD5');
var Promise = require('../../common/utils/Promise');

module.exports = function(User) {
    User.definition.settings.virtuals = {
        picture: function (user) {
            return User.getPictureObj(user);
        }
    };

    User.validatesInclusionOf('gender', {in: ['male', 'female']});

    User.beforeSave = function(next, user) {
        if (!user.picture) user.picture =  'http://www.gravatar.com/avatar/' + md5(user.email);
        next();
    }

    User.afterSave = function (next) {
        var user = this;

        Q.denodeify(User.getApp.bind(User))()
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

    User.getShortUser = function (id) {
        var deferred = Promise.defer();

        User.findById(id, function (error, user) {
            if (error) return deferred.reject(error);

            if (user) {
                deferred.resolve({
                    id       : user.id,
                    firstName: user.firstName,
                    lastName : user.lastName,
                    picture  : User.getPictureObj(user)
                });
            } else {
                deferred.resolve(null);
            }
        });

        return deferred.promise;
    };

    User.getPictureObj = function (user) {
        if (user.picture && user.picture.indexOf('http') == 0) {
            return {publicUrl: user.picture};
        }

        var picture = new Picture(user.picture, 'user-profile-pictures', User.app.get('url'));

        return picture.publicObject();
    };
}
