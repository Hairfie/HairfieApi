var Promise = require('../../common/utils/Promise'),
    Q = require('q'),
    lodash = require('lodash');

module.exports = function(Place) {
    Place.prototype.toRemoteObject = function (context) {
        return this.toRemoteShortObject();
    };

    Place.prototype.toRemoteShortObject = function (context) {
        return {
            id          : this.id,
            name        : this.name,
            description : this.description,
            zipCodes    : this.zipCodes
        };
    };
};