'use strict';

module.exports = function (UserCredential) {
    UserCredential.afterCreate = function (next) {
        UserCredential.app.models.user.afterIdentityCreate(this, next);
    };
};
