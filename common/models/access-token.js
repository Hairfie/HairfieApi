'use strict';

module.exports = function (AccessToken) {

    AccessToken.prototype.toRemoteObject =
    AccessToken.prototype.toRemoteShortObject = function (context) {
        return {
            id      : this.id,
            ttl     : this.ttl,
            userId  : this.userId,
            created : this.created
        };
    };

}
