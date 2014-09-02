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
      console.log("resetPasswordRequest");
      console.log(info.email); // the email of the requested user

      var url =  "http://localhost:3000/" + "#/reset_password?token="+ info.accessToken.id + "&uid=" + info.user.id;

      console.log(url);


      // // requires AccessToken.belongsTo(User)
      // info.accessToken.user(function (err, user) {
      //   console.log(user); // the actual user
      //   var emailData = {
      //     user: user,
      //     accessToken: accessToken
      //   };

      //   // this email should include a link to a page with a form to
      //   // change the password using the access token in the email
      //   Email.send({
      //     to: user.email,
      //     subject: 'Reset Your Password',
      //     text: loopback.template('reset-template.txt.ejs')(emailData),
      //     html: loopback.template('reset-template.html.ejs')(emailData)
      //   });
      // });
    });
}

    User.prototype.getFullEmail = function () {
        return this.getFullName()+ ' <'+this.email+'>';
    }

    User.prototype.getFullName = function () {
        return this.firstName+' '+this.lastName;
    }

    User.on('resetPasswordRequest', function (info) {
        info.accessToken.user(function (error, user) {
            if (error) return console.log(error);

            User.getApp(function (app) {
                app.models.email.resetUserPassword(user, info.accessToken);
            });
        });
    });
}