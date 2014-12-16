'use strict';

var Promise = require('../utils/Promise');

module.exports = function (BusinessMemberFavorite) {
    BusinessMemberFavorite.validateAsync('businessMemberId', function (onError, onDone) {
        this.businessMember(function (error, businessMember) {
            if (error || !businessMember) onError();
            onDone();
        });
    }, {message: 'exists'});
    BusinessMemberFavorite.validateAsync('userId', function (onError, onDone) {
        this.user(function (error, user) {
            if (error || !user) onError();
            onDone();
        });
    }, {message: 'exists'});

    BusinessMemberFavorite.prototype.toRemoteObject = function (context) {
        var businessMember = Promise.ninvoke(this.businessMember).then(function (businessMember) {
            return businessMember ? businessMember.toRemoteObject(context) : null;
        });

        return {
            hairdresser    : businessMember, // NOTE: deprecated
            businessMember : businessMember,
            createdAt      : this.createdAt
        };
    };
};
