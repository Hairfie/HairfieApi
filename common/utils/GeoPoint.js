module.exports = require('loopback-datasource-juggler/lib/geo');

module.exports.GeoPoint.prototype.asElasticPoint = function () {
    return {
        lat: this.lat,
        lon: this.lng
    }
}

module.exports.GeoPoint.prototype.streetViewPic = function(app) {
    return app.generateUrl('streetView', {
        latitude: this.lat,
        longitude: this.lng
    });
};
