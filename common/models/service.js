'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (Service) {
    Service.prototype.toRemoteObject =
    Service.prototype.toRemoteShortObject =
    function (context) {
        return {
            id      : this.id,
            label   : context.localized(this.label)
        };
    };
};
