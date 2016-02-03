'use strict';

var Q = require('q');
var _ = require('lodash');

module.exports = function (Business) {
    Business.prototype.getYelpId = function () {
        var Yelp = Business.app.models.Yelp;
        var business = this;

        return Yelp.phoneSearch(business.getPhoneNumber())
        .then(function(result) {
            console.log("Processing...");

            console.log("Hairfie ID : ", business.id);
            console.log("Name : ", business.name);
            console.log("City : ", business.address.city);
            console.log("result", result);
            if (!result) throw new Error("No Yelp Business");

            if(_.isArray(result))  {
                var yelpIds = _.map(result, 'id');
                var yelpObject = business.yelpObject || {};
                yelpObject.multipleIds = yelpIds;
                business.yelpObject = yelpObject;
            } else {
                console.log("Found YELP ID in result", result.id);
                var yelpObject = business.yelpObject || {};
                yelpObject.id = result.id;
                business.yelpObject = yelpObject;
            }
            return Q.ninvoke(business, 'save');
        })
        .catch(function(error) {
            console.log("ERROR IN YELP", error);
        })
    };

    Business.prototype.getYelpObject = function () {
        var Yelp = Business.app.models.Yelp;
        var business = this;

        var yelpId = business.yelpId || business.yelpObject.id;
        if(!yelpId) return;

        return Yelp.business(yelpId)
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
            yelpObject.url = yelpBusiness.url

            console.log("review_count", yelpObject.review_count);
            console.log("rating", yelpObject.rating);

            business.yelpObject = yelpObject;
            business.yelpId = yelpObject.id;

            return Q.ninvoke(business, 'save');
        })
        .then(function(business) {
            return business.yelpObject && business.yelpObject.id;
        })
        .catch(function(error) {
            console.log("ERROR IN YELP", error);
        })
    };

    // Business.observe('after save', function(ctx, next) {
    //     if(ctx.instance) {
    //         ctx.instance = cleanPhoneNumber(ctx.instance);
    //     } else if (ctx.data) {
    //         ctx.currentInstance = cleanPhoneNumber(ctx.data);
    //     }
    //     next();
    // });
};
        // .then(function(found, yelpId) {
        //     if(!found) throw new Error("Multiple or not found, skipping");

        //     if(business.yelpId && !yelpId) {
        //         return Yelp.business(business.yelpId);
        //     } else if(yelpId) {
        //         return Yelp.business(yelpId);
        //     } else {
        //         return;
        //     }
        // })
        // .then(function(yelpBusiness) {
        //     console.log("Found YELP ID", yelpBusiness.id);
        //     console.log("Hairfie Name : %s  and Id :", business.name, business.id);

        //     var yelpObject = {};
        //     yelpObject.id = yelpBusiness.id;
        //     yelpObject.rating = yelpBusiness.rating;
        //     yelpObject.review_count = yelpBusiness.review_count;
        //     yelpObject.rating_img_url_small = yelpBusiness.rating_img_url_small;
        //     yelpObject.rating_img_url = yelpBusiness.rating_img_url;
        //     yelpObject.reviews = yelpBusiness.reviews;
        //     yelpObject.rating_img_url_large = yelpBusiness.rating_img_url_large;
        //     yelpObject.url = yelpBusiness.url

        //     console.log("review_count", yelpObject.review_count);
        //     console.log("rating", yelpObject.rating);

        //     business.yelpObject = yelpObject;
        //     business.yelpId = yelpObject.id;

        //     return Q.ninvoke(business, 'save');
        // })