'use strict';

var ejs = require('elastic.js');

module.exports = require('loopback-datasource-juggler/lib/geo');

module.exports.GeoPoint.prototype.asElasticJsGeoPoint = function () {
    return ejs.GeoPoint([this.lat, this.lng]);
};

module.exports.GeoPoint.prototype.streetViewPic = function(app) {
    return app.generateUrl('streetView', {
        latitude: this.lat,
        longitude: this.lng
    });
};
