'use strict';

var UUID = require('uuid');

module.exports = function (UserCredential) {
    UserCredential.beforeCreate = function (next) {
        this.id = this.id || UUID.v4();
        next();
    };

    UserCredential.afterCreate = function (next) {
        UserCredential.app.models.user.afterIdentityCreate(this, next);
    };
};
