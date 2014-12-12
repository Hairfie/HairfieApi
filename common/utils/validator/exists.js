'use strict';

module.exports = function (relation) {
    return function (ok, no) {
        if (!this[relation+'Id']) ok();
        else {
            this[relation](function (error, related) {
                if (error || !related) no();
                else ok();
            });
        }
    }
}
