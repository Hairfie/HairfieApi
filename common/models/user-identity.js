'use strict';

var UUID = require('uuid');

module.exports = function (UserIdentity) {
    UserIdentity.beforeCreate = function (next) {
        this.id = this.id || UUID.v4();
        next();
    };

    UserIdentity.afterCreate = function (next) {
        UserIdentity.app.models.user.afterIdentityCreate(this, next);
    };
};
