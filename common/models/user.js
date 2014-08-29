'use strict';

var md5 = require('MD5');

module.exports = function(User) {
  User.validatesInclusionOf('gender', {in: ['male', 'female']});

  User.beforeSave = function(next, user) {
    if (!user.picture) user.picture =  'http://www.gravatar.com/avatar/' + md5(user.email);
    next();
  };
}