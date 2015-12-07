'use strict';

var cache = require('express-redis-cache')({
    host: "aws-eu-west-1-portal.2.dblayer.com", 
    port: 10052, 
    auth_pass: "HCFXKTBYCYQSPDVD",
    prefix: "staging"
});

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
};