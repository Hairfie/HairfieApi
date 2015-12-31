'use strict';

var cache = require('express-redis-cache');

module.exports = function (app) {
    var client = cache({
        host: app.get('redisHost'),
        port: app.get('redisPort'),
        auth_pass: app.get('redisPassword'),
        prefix: app.get('redisPrefix'),
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

    app.get('/*/blogPosts', client.route({ expire: 3600 }), function (req, res, next) {
        next();
    });

    app.get('/*/tops/hairfies', client.route({ expire: 3600 }), function (req, res, next) {
        next();
    });

    app.get('/*/tops/deals', client.route({ expire: 3600 }), function (req, res, next) {
        next();
    });

    app.get('/*/tops/hairfies/:businessId', function (req, res, next) {
        res.express_redis_cache_name = 'top-hairfies-' + req.params.businessId;
        next();
    });

    app.get('/*/tops/hairfies/:businessId', client.route({ expire: 60 }), function (req, res, next) {
        next();
    });

    app.get('/*/tags', client.route({ expire: 3600*24, type: 'application/json; charset=utf-8' }), function (req, res, next) {
        next();
    });

    app.get('/*/categories', client.route({ expire: 3600*24, type: 'application/json; charset=utf-8'  }), function (req, res, next) {
        next();
    });

    app.get('/*/stations', client.route({ expire: 3600*24 }), function (req, res, next) {
        next();
    });

    app.get('/*/hairfies/similar-hairfies', client.route({ expire: 3600*24 }), function (req, res, next) {
        next();
    });

    app.get('/*/businesses/:businessId/similar', function (req, res, next) {
        res.express_redis_cache_name = 'businesses-similar-' + req.params.businessId;
        next();
    });

    app.get('/*/businesses/:businessId/similar', client.route({ expire: 60 }), function (req, res, next) {
        next();
    });

    app.get('/v1.2.2/hairfies/search', function (req, res, next) {
        res.express_redis_cache_name = 'hairfies-search-' + JSON.stringify(req.params);
        next();
    });

    app.get('/v1.2.2/hairfies/search', client.route({ expire: 60 }), function (req, res, next) {
        next();
    });
};