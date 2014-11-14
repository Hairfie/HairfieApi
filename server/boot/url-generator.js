'use strict';

var UrlGenerator = require('../../common/utils/UrlGenerator');

module.exports = function (app) {
    app.on('started', function () {
        var urlGenerator = new UrlGenerator({
            baseUrl: app.get('url'),
            webUrl: app.get('webUrl'),
            routes:  require('../routes.js')
        });

        app.urlGenerator = urlGenerator;
        app.generateUrl = function (name, params) {
            return urlGenerator.generate(name, params);
        };
    });
};
