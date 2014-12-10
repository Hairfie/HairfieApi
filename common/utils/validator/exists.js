'use strict';

module.exports = function (relation) {
    return function (onDone, onError) {
        if (!this[relation+'Id']) return onDone();

        this[relation](function (error, related) {
            if (error || !related) return onError();
            onDone();
        });
    }
}
