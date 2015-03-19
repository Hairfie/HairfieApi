'use strict';

var Hooks = require('./hooks');

module.exports = function (UserCredential) {
    Hooks.generateId(UserCredential);

    UserCredential.afterCreate = function (next) {
        UserCredential.app.models.user.afterIdentityCreate(this, next);
    };
};
