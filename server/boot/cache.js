'use strict';

var cache = require('express-redis-cache');
var _ = require('lodash');

module.exports = function (app) {
    var client = cache({
        host: app.get('redisHost'),
        port: app.get('redisPort'),
        auth_pass: app.get('redisPassword'),
        prefix: app.get('redisPrefix'),
        type: 'application/json',
        expire: {
            200: 5000,
            404: 10,
            401: 1,
            403: 5000,
            500: 1,
            503: 1
        }
    });

    app.cacheClient = client;

    if(!process.env.DISABLE_CACHE) {
        app.get('/*/blogPosts', client.route({ expire: 3600 }), function (req, res, next) {
            next();
        });

        app.get('/*/tops/hairfies', client.route({ expire: 3600*24 }), function (req, res, next) {
            next();
        });

        app.get('/*/tops/deals', client.route({ expire: 3600 }), function (req, res, next) {
            next();
        });

        app.get('/*/tops/businessReviews', client.route({ expire: 3600*24 }), function (req, res, next) {
            next();
        });

        app.get('/*/tops/hairfies/:businessId', function (req, res, next) {
            res.express_redis_cache_name = 'top-hairfies-' + req.params.businessId;
            next();
        });

        app.get('/*/tops/hairfies/:businessId', client.route({ expire: 60 }), function (req, res, next) {
            next();
        });

        app.get('/v0/tags', client.route({ expire: 3600*24 }), function (req, res, next) {
            req.header('Content-Type', 'application/json; charset=utf-8');
            next();
        });

        app.get('/*/tags', client.route({ expire: 3600*24 }), function (req, res, next) {
            next();
        });

        app.get('/v0/categories', client.route({ expire: 3600*24  }), function (req, res, next) {
            req.header('Content-Type', 'application/json; charset=utf-8');
            next();
        });

        app.get('/*/categories', client.route({ expire: 3600*24 }), function (req, res, next) {
            next();
        });

        app.get('/*/selections', client.route({ expire: 3600*24 }), function (req, res, next) {
            next();
        });

        app.get('/*/stations', client.route({ expire: 3600*24 }), function (req, res, next) {
            next();
        });

        app.get('/*/hairfies/similar-hairfies', client.route({ expire: 3600*24*7 }), function (req, res, next) {
            next();
        });

        app.get('/*/businesses/:businessId/similar', client.route({ expire: 3600*24*7 }), function (req, res, next) {
            next();
        });

        app.get('/v1.2.2/hairfies/search', client.route({ expire: 60*30 }), function (req, res, next) {
            next();
        });
    }
};