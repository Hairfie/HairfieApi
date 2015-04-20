'use strict';

var Q = require('q');

module.exports = function (AccessToken) {

    AccessToken.prototype.toRemoteObject =
    AccessToken.prototype.toRemoteShortObject = function (context) {
        var User = AccessToken.app.models.user;


        return Q.ninvoke(User, 'findById', this.userId)
            .then(function (user) {
                return {
                    id          : this.id,
                    ttl         : this.ttl,
                    userId      : this.userId,
                    created     : this.created,
                    parentId    : this.parentId,
                    permissions : user ? user.getPermissions() : []
                };
            }.bind(this));
    };

    AccessToken.findValidById = function (id) {
        var deferred = Q.defer();

        AccessToken.findById(id, function (error, token) {
            console.log('token', id, token);
            if (error) return deferred.reject(error);
            if (!token) return deferred.resolve(null);

            token.validate(function (error, isValid) {
                if (error) return deferred.reject(error);
                if (!isValid) return deferred.resolve(null);
                deferred.resolve(token);
            });
        });

        return deferred.promise;
    };

    AccessToken.impersonate = function (accessTokenId, userId, cb) {
        var User = AccessToken.app.models.user;

        return Q
            .all([
                AccessToken.findValidById(accessTokenId),
                Q.ninvoke(User, 'findById', userId)
            ])
            .spread(function (parentToken, user) {
                if (!parentToken) throw {status: 404, message: 'Token not found'};
                if (!user) throw {status: 406, message: 'User not found'};

                return [
                    parentToken,
                    Q.ninvoke(User, 'findById', parentToken.userId),
                    user
                ];
            })
            .spread(function (parentToken, parentUser, user) {
                if (!(parentUser || {}).admin) throw {status: 403, message: 'Not allowed'};

                return Q.ninvoke(user.accessTokens, 'create', {
                    ttl     : 86400, // 1 day
                    parent  : parentToken
                });
            });
    };

    AccessToken.remoteMethod('impersonate', {
        description: 'Impersonates the access token',
        accepts: [
            {arg: 'accessTokenId', type: 'string', required: true, description: 'Identifier of the access token to impersonate'},
            {arg: 'userId', type: 'string', required: true, description: 'Identifier of the user to log in as'}
        ],
        returns: {root: true},
        http: {verb: 'POST', path: '/:accessTokenId/impersonate'}
    });
}
