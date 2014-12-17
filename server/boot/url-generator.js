'use strict';

var UrlGenerator = require('../../common/utils/UrlGenerator');

module.exports = function (app) {
    app.on('started', function () {
        var urlGenerator = new UrlGenerator({
            baseUrl: app.get('url'),
            webUrl:  app.get('webUrl'),
            cdnUrl:  app.get('cdnUrl') || app.get('url'),
            routes:  require('../routes.js')
        });

        app.urlGenerator = urlGenerator;
        app.generateUrl = function (name, params, customUrlType) {
            return urlGenerator.generate(name, params, customUrlType);
        };
    });
};
