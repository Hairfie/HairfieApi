'use strict';

var Promise = require('../../common/utils/Promise');
var Hooks = require('./hooks');

module.exports = function (HairfieLike) {
    Hooks.generateId(HairfieLike);
    Hooks.updateTimestamps(HairfieLike);

    HairfieLike.prototype.toRemoteObject = function (context) {
        return {
            hairfie : Promise.ninvoke(this.hairfie).then(function (hairfie) {
                console.log("hairfie", hairfie);
                return hairfie ? hairfie.toRemoteObject(context) : null;
            }),
            createdAt: this.createdAt
        };
    };

    HairfieLike.validateAsync('userId', function (onError, onDone) {
        this.user(function (error, user) {
            if (error || !user) onError();
            onDone();
        });
    }, {message: 'exists'});

    HairfieLike.validateAsync('hairfieId', function (onError, onDone) {
        this.hairfie(function (error, hairfie) {
            if (error || !hairfie) onError();
            onDone();
        });
    }, {message: 'exists'});
};
