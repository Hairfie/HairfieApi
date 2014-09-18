'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (HairfieLike) {

    HairfieLike.prototype.toRemoteObject = function () {
        return {
            hairfie : Promise.ninvoke(this.hairfie).then(function (hairfie) {
                return hairfie ? hairfie.toRemoteObject() : null;
            }),
            createdAt: this.createdAt
        };
    };

};
