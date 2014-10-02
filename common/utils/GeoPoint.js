module.exports = require('loopback-datasource-juggler/lib/geo');

module.exports.GeoPoint.prototype.asElasticPoint = function () {
    return {
        lat: this.lat,
        lon: this.lng
    }
}

module.exports.GeoPoint.prototype.streetViewPic = function(app) {
    return app.get('url')+'/service/google/streetview/'+this.lat+'/'+this.lng;
};
