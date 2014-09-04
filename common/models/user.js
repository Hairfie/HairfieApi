'use strict';

var md5 = require('MD5');
var Q = require('q');

module.exports = function(User) {
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
    }

    User.prototype.getFullName = function () {
        return this.firstName+' '+this.lastName;
    }
}
