var async = require('async');
var GeoPoint = require('loopback-datasource-juggler/lib/geo').GeoPoint;
var Abstract = require('./abstract.js');
var Q = require('q');

module.exports = function(Business) {

    Abstract.extend(Business);

    Business.definition.settings.hidden = ['diane_data', 'pj_data', 'city', 'zipcode', 'street'];

    Business.afterSave = function (next) {
      var business = this;

      Business.getApp(function (_, app) {
          // index business on search engine
          app.models.SearchEngine.index('business', business.id, {
              name: business.name,
              gps:  {lat: business.gps.lat, lon: business.gps.lng}
          });
      });

      next();
    };

    Business.afterDelete = function (next) {
        Business.getApp(function (_, app) {
            // remove business from search index
            app.models.SearchEngine.delete('business', business.id);
        });

        next();
    };

    Business.definition.settings.virtuals = {
        timetables: function (obj) {
            return obj.timetables ? obj.timetables : {};
        },
        address: function(obj) {
          return {
            street: obj.street ? obj.street.upperFirst() : '',
            zipcode: obj.zipcode,
            city: obj.city ? obj.city.upperFirst() : ''
          };
        },
        pictures: function(obj) {
          var gps = GeoPoint(obj.gps);
          return [gps.streetViewPic()];
        },
        thumb: function(obj) {
          var gps = GeoPoint(obj.gps);
          return gps.streetViewPic(120, 140);
        }
    };

    Business.nearby = function(here, query, page, limit, callback) {
        var maxDistance = 1000,
            here        = GeoPoint(here),
            page        = page || 0,
            limit       = limit || 10;


        Q.denodeify(Business.getApp.bind(Business))()
            .then(function (app) {
                var searchEngine = app.models.SearchEngine;

                // @todo build query using elasticjs (http://docs.fullscale.co/elasticjs/)
                var body = {
                    from: page * limit,
                    size: limit,
                    query: {
                        filtered: {
                            filter: {
                                geo_distance: {
                                    distance: maxDistance,
                                    distance_unit: 'm',
                                    gps: here.asElasticPoint()
                                }
                            }
                        }
                    },
                    sort: {
                        _geo_distance: {
                            gps: here.asElasticPoint(),
                            order: 'asc',
                            unit: 'm'
                        }
                    }
                }

                if (query) {
                    body.query.filtered.query = {
                        match: {
                            name: query
                        }
                    };
                }

                return app.models.SearchEngine.search('business', body);
            })
            .then(function (result) {
                var ids = [], distances = {};
                result[0].hits.hits.forEach(function (hit) {
                    ids.push(hit._id);
                    distances[hit._id] = Math.round(hit.sort[0]);
                });

                return Q.denodeify(Business.findByIds.bind(Business))(ids)
                    .then(function (businesses) {
                        // add distance to businesses
                        return businesses.map(function (business) {
                            business.distance = distances[business.id];

                            return business;
                        });
                    })
                ;
            })
            .nodeify(callback)
        ;
    }

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
            description: 'Find nearby locations around you',
            accepts: [
                {arg: 'here', type: 'GeoPoint', required: true, description: 'geo location:lng,lat. For ex : 2.30,48.87'},
                {arg: 'query', type: 'String', description: 'plain text search'},
                {arg: 'page', type: 'Number', description: 'number of pages (page size defined by limit)'},
                {arg: 'limit', type: 'Number', description: 'number of businesss to get, default=10'}
            ],
            returns: {arg: 'businesses', root: true},
            http: { verb: 'GET' }
        });
    };

    Business.setup();

};
