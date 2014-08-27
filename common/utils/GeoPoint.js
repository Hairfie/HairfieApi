module.exports = require('loopback-datasource-juggler/lib/geo');

module.exports.GeoPoint.prototype.asElasticPoint = function () {
    return {
        lat: this.lat,
        lon: this.lng
    }
}

module.exports.GeoPoint.prototype.streetViewPic = function(width, height) {
    width = width || 600;
    height = height|| 400;
    return "http://maps.googleapis.com/maps/api/streetview?size="+width+"x"+height+"&location="+this.lat + ',' + this.lng;
};
