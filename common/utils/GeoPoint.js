'use strict';

module.exports = require('loopback-datasource-juggler/lib/geo');

module.exports.GeoPoint.prototype.asLatLngString = function () {
    return this.lng + ',' + this.lat;
};

module.exports.GeoPoint.prototype.streetViewPic = function(app) {
    return app.generateUrl('streetView', {
        longitude: this.lng,
        latitude: this.lat
    });
};
