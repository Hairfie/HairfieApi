'use strict';

module.exports = function (UserIdentity) {
    UserIdentity.afterCreate = function (next) {
        UserIdentity.app.models.user.afterIdentityCreate(this, next);
    };
};
