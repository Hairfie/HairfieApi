var Promise = require('../../common/utils/Promise'),
    Q = require('q'),
    lodash = require('lodash'),
    request = require('superagent');

var UUID = require('uuid');

module.exports = function(Place) {
    Place.observe('before save', function generateId(ctx, next) {
        if (ctx.instance) ctx.instance.id = ctx.instance.id || UUID.v4();
        next();
    });

    Place.prototype.toRemoteObject = function (context) {
        return this.toRemoteShortObject();
    };

    Place.prototype.toRemoteShortObject = function (context) {
        return {
            id      : this.id,
            href    : Place.app.urlGenerator.api('places/'+this.id),
            name    : this.name.fr,
            location: this.location,
            bounds  : this.bounds
        };
    };

    Place.query = function findByName(address, cb) {
        var address = (address || '')
            .trim()
            .replace('/', ' ')
            .replace(')', '')
            .replace('(', '')
            .replace(']', '')
            .replace('[', '')
            .replace(/\s+/g, ' ');

        // 1. Try to find exact match by name
        Place.findOne({where:{'name.fr': address}}, function (error, place) {
            if (error) return cb(error);
            if (place) return cb(null, [place]); // jackpot!

            // 2. Try to create a place using geocoder
            geocode(address, 'fr')
                .then(function (results) {
                    if (0 == results.lenth) return cb(null, []);

                    var result = results[0]; // take first result

                    // Try to find existing place for the result using Google's place id
                    Place.findOne({where: {googlePlaceId: result.place_id}}, function (error, place) {
                        if (error) return cb(error);
                        if (place) return cb(null, [place]);

                        var place = new Place({
                            googlePlaceId   : result.place_id,
                            googleTypes     : result.types,
                            googleComponents: {
                                fr: result.address_components
                            },
                            name            : {
                                fr: result.formatted_address
                            },
                            location        : result.geometry.location,
                            bounds          : result.geometry.bounds && {
                                northEast: result.geometry.bounds.northeast,
                                southWest: result.geometry.bounds.southwest
                            }
                        });

                        place.save(function (error, place) {
                            if (error) cb(error);
                            else cb(null, [place]);
                        });
                    });
                })
                .fail(cb);
        });
    };

    Place.remoteMethod('query', {
        description: 'Queries places',
        accepts: [
            {arg: 'address', type: 'string', description: 'Name of the place'}
        ],
        returns: {arg: 'Place', root: true},
        http: { verb: 'GET', path: '/' }
    });
};

function geocode(address, language) {
    var deferred = Promise.defer();

    console.log('Geocoding', address, 'in', language);

    request
        .get('https://maps.googleapis.com/maps/api/geocode/json')
        .query({
            address : address,
            types   : 'geocode',
            language: language
        })
        .end(function (error, response) {
            if (error) return deferred.reject(error);

            deferred.resolve(response.body.results);
        });

    return deferred.promise;
};
