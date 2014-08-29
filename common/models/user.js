'use strict';

var md5 = require('MD5');

module.exports = function(User) {
  User.validatesInclusionOf('gender', {in: ['male', 'female']});

  User.beforeSave = function(next, user) {
    if (!user.picture) user.picture =  'http://www.gravatar.com/avatar/' + md5(user.email);
    next();
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
        gender: gender,
        picture: "http://graph.facebook.com/" + profile.id + '/picture'
      };
      return userObj;
    }
}