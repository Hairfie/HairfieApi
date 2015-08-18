'use strict';

module.exports = require('loopback-datasource-juggler/lib/geo');

module.exports.GeoPoint.prototype.asLatLngString = function () {
    return this.lat + ',' + this.lng;
};

module.exports.GeoPoint.prototype.streetViewPic = function(app) {
    return app.generateUrl('streetView', {
        longitude: this.lat,
        latitude: this.lng
    });
};
