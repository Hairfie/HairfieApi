'use strict';

module.exports = function (HairfieLike) {

    Hairfie.validateAsync('userId', function (onError, onDone) {
        this.user(function (error, user) {
            if (error || !user) onError();
            onDone();
        });
    }, {message: 'exists'});

    Hairfie.validateAsync('hairfieId', function (onError, onDone) {
        this.hairfie(function (error, hairfie) {
            if (error || !hairfie) onError();
            onDone();
        });
    }, {message: 'exists'});

};
