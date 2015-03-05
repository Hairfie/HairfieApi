'use strict';

var moment = require('moment');

module.exports = function (Top) {

    Top.hairfies = function (limit, next) {
        var limit = Math.max(0, Math.min(20, limit || 10));
        var Hairfie = Top.app.models.Hairfie;
        var lastMonth = moment().subtract(1, 'month').toDate();

        Hairfie
            .listMostLikedSince(lastMonth, limit)
            .then(next.bind(null, null), next);
    };

    Top.remoteMethod('hairfies', {
        description: 'Returns the top hairfies of the moment',
        accepts: [
            {arg: 'limit', type: 'number', description: 'Maximum number of hairfies to return (default 10)'}
        ],
        returns: {arg: 'Hairfie', root: true},
        http: { verb: 'GET', path: '/hairfies' }
    });

};
