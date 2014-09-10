'use strict';

module.exports = Promise = require('q');

/**
 * Items can be an array or a promise for an array. Each item can be a promise too.
 *
 * The result of the mapper can be a promise.
 */
Promise.map = function (items, mapper) {
    return Promise(items)
        .then(function (items) {
            return Promise.all(items.map(function (item) {
                return Promise(item).then(mapper);
            }));
        })
    ;
};

Promise.sequence = function (funcs, initialVal) {
    return funcs.reduce(Promise.when, Promise(initialVal));
};

Promise.resolveDeep = function (obj) {
    return Promise(obj).then(function (obj) {
        if ('object' !== typeof obj) return obj;

        var props = [];
        for (var key in obj) if (obj.hasOwnProperty(key)) {
            var prop = Promise
                .all([key, Promise.resolveDeep(obj[key])])
                .spread(function (k, v) { obj[k] = v; });

            props.push(prop);
        }

        return Promise.all(props).then(function () { return obj; }, console.log);
    });
};
