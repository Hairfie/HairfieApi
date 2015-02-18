var Promise = require('../../common/utils/Promise'),
    Q = require('q'),
    lodash = require('lodash');

var UUID = require('uuid');

module.exports = function(Place) {
    Place.beforeCreate = function (next) {
        this.id = this.id || UUID.v4();
        next();
    };

    Place.prototype.toRemoteObject = function (context) {
        return this.toRemoteShortObject();
    };

    Place.prototype.toRemoteShortObject = function (context) {
        return {
            id          : this.id,
            href        : Place.app.urlGenerator.api('places/'+this.id),
            name        : this.name,
            description : this.description,
            zipCodes    : this.zipCodes
        };
    };
};
