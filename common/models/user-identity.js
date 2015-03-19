'use strict';

var Hooks = require('./hooks');

module.exports = function (UserIdentity) {
    Hooks.generateId(UserIdentity);

    UserIdentity.afterCreate = function (next) {
        UserIdentity.app.models.user.afterIdentityCreate(this, next);
    };
};
