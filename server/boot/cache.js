'use strict';

var cache = require('express-redis-cache');

module.exports = function (app) {
    var client = cache({
        host: app.get('redisHost'),
        port: app.get('redisPort'),
        auth_pass: app.get('redisPassword'),
        prefix: app.get('redisPrefix')
    });

    app.get('/*/blogPosts', client.route({ expire: 10000, type: "application/json" }), function (req, res, next) {
        next();
    });

    app.get('/*/tops/hairfies', client.route({ expire: 10000, type: "application/json" }), function (req, res, next) {
        next();
    });

    app.get('/*/tops/deals', client.route({ expire: 10000, type: "application/json" }), function (req, res, next) {
        next();
    });

    app.get('/*/tags', client.route({ expire: 10000, type: "application/json" }), function (req, res, next) {
        next();
    });

    app.get('/*/categories', client.route({ expire: 3600, type: "application/json" }), function (req, res, next) {
        next();
    });

    app.get('/*/hairfies/similar-hairfies', client.route({ expire: 100000, type: "application/json" }), function (req, res, next) {
        next();
    })
};