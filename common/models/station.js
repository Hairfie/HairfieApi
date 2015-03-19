'use strict';

var moment = require('moment');
var Promise = require('../../common/utils/Promise');
var _ = require('lodash');

module.exports = function (Station) {

    Station.nearby = function (location, cb) {

    };

    Station.remoteMethod('nearby', {
        description: 'Returns the stats for a specific business',
        accepts: [
            {arg: 'location', type: 'string', required: true, description: 'geo location:{lng: ,lat:}.'},
        ],
        returns: {arg: 'stations', root: true},
        http: { verb: 'GET', path: '/stations/' }
    });
};