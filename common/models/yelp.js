'use strict';

var Q = require('q');
var _ = require('lodash');
var YelpClient = require('yelp');

module.exports = function (Yelp) {
    var client;

    Yelp.on('dataSourceAttached', function () {
        client = new YelpClient({
          consumer_key: Yelp.dataSource.settings.consumer_key,
          consumer_secret: Yelp.dataSource.settings.consumer_secret,
          token: Yelp.dataSource.settings.token,
          token_secret: Yelp.dataSource.settings.token_secret,
        });
    });

    Yelp.phoneSearch = function(phone) {
        return client.phoneSearch({ phone: phone })
            .then(function(result) {
                if(result.total == 0) {
                    console.log("Pas de business trouvé sur Yelp");
                    return;
                } else if(result.total > 1) {
                    console.log("Plusieurs businesses trouvés", result.businesses);
                    return result.businesses;
                } else {
                    return result.businesses[0];
                }
            })
            .catch(function(error) {
                console.log("error in yelp search", error);
            })
    }

    Yelp.business = function(yelpId) {
        console.log("yelp.business", yelpId);
        return client.business(yelpId)
            .then(function(result) {
                return result;
            })
            .catch(function(error) {
                console.log("error in yelp business", error);
            })
    }
};