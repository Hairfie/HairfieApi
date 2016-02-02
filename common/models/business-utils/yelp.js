'use strict';

var Q = require('q');
var _ = require('lodash');

module.exports = function (Business) {
    Business.prototype.getYelpObject = function () {
        var Yelp = Business.app.models.Yelp;
        var business = this;

        return Yelp.phoneSearch(business.getPhoneNumber())
        .then(function(yelpBusiness) {
            return yelpBusiness.id;
        })
        .then(function(yelpId) {
            if(!yelpId && business.yelpId) {
                return Yelp.business(business.yelpId);
            }
            if(yelpId) {
                return Yelp.business(yelpId);
            }
        })
        .then(function(yelpBusiness) {
            console.log("Found YELP ID", yelpBusiness.id);
            console.log("Hairfie Name : %s  and Id :", business.name, business.id);

            var yelpObject = {};
            yelpObject.id = yelpBusiness.id;
            yelpObject.rating = yelpBusiness.rating;
            yelpObject.review_count = yelpBusiness.review_count;
            yelpObject.rating_img_url_small = yelpBusiness.rating_img_url_small;
            yelpObject.rating_img_url = yelpBusiness.rating_img_url;
            yelpObject.reviews = yelpBusiness.reviews;
            yelpObject.rating_img_url_large = yelpBusiness.rating_img_url_large;

            console.log("review_count", yelpObject.review_count);
            console.log("rating", yelpObject.rating);

            business.yelpObject = yelpObject;
            business.yelpId = yelpObject.id;

            return Q.ninvoke(business, 'save');
        })
        .catch(function(error) {
                console.log("ERROR IN YELP", error);
            })

    };
};