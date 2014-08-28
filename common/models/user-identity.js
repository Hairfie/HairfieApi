'use strict';

var Q = require('q');

module.exports = function (UserIdentity) {

    UserIdentity.afterSave = function (next) {
        var identity = this;

        // complete user with identiy values if necessary
        this.user(function (error, user) {
            if (error) next(error);
            else {
                if (identity.profile && identity.profile.name) {
                    var name = identity.profile.name;

                    if (!user.firstName && name.givenName) {
                        user.firstName = name.givenName;
                    }

                    if (!user.lastName && name.familyName) {
                        user.lastName = name.familyName;
                    }
                }

                user.save(function(error) {
                    if (error) next(error);
                    else next();
                });
            }
        });
    }
}
