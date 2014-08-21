module.exports = function(Business) {

  Business.nearby = function(here, page, max, limit, fn) {
    if (typeof page === 'function') {
      fn = page;
      page = 0;
      max = 0;
    }

    if (typeof max === 'function') {
      fn = max;
      max = 0;
    }

    var limit = limit || 10;
    page = page || 0;
    max = Number(max || 100000);


    Business.find({
      // find locations near the provided GeoPoint
      where: {gps: {near: here, maxDistance: max}},
      // paging
      skip: limit * page,
      limit: limit
    }, fn);
  };

  // Google Maps API has a rate limit of 10 requests per second
  // Seems we need to enforce a lower rate to prevent errors
  var lookupGeo = require('function-rate-limit')(5, 1000, function() {
    var geoService = Business.app.dataSources.geo;
    geoService.geocode.apply(geoService, arguments);
  });

  Business.beforeSave = function(next, business) {
    if (business.gps) return next();
    if(!business.street || !business.city || !business.zipcode) return next();

    // geo code the address
    lookupGeo(business.street, business.city, business.zipcode,
      function(err, result) {
        if (result && result[0]) {
          business.gps = result[0].lng + ',' + result[0].lat;
          next();
        } else {
          console.log('could not find location');
          console.log(err);
          next();
        }
      });
  };

  Business.setup = function() {
    Business.base.setup.apply(this, arguments);

    this.remoteMethod('nearby', {
      description: 'Find nearby locations around the geo point',
      accepts: [
        {arg: 'here', type: 'GeoPoint', required: true,
          description: 'geo location (lat & lng)'},
        {arg: 'page', type: 'Number',
          description: 'number of pages (page size defined by limit)'},
        {arg: 'limit', type: 'Number',
          description: 'number of businesss to get, default=10'},
        {arg: 'max', type: 'Number',
          description: 'max distance in miles'}
      ],
      returns: {arg: 'locations', root: true},
      http: { verb: 'GET' }
    });
  };

  Business.setup();

  Business.prototype.gpsString = function() {
    if(this.gps) {
      return this.gps.lat+","+this.gps.lng;
    } else {
      return "";
    }
  };

  Business.prototype.getStreetViewPic = function (width, height) {
    width  = width || 400;
    height = height || 400;
    console.log(this.gpsString);
    return "http://maps.googleapis.com/maps/api/streetview?size="+width+"x"+height+"&location="+this.gpsString();
  };

};