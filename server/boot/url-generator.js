'use strict';

var UrlGenerator = require('../../common/utils/UrlGenerator');

module.exports = function (app) {
    app.on('started', function () {
        var urlGenerator = new UrlGenerator({
            defaultApp  : 'api',
            baseUrl     : {
                'api'       : app.get('url'),
                'website'   : app.get('webUrl'),
                'cdn'       : app.get('cdnUrl') || app.get('url'),
                'pro'       : app.get('proUrl')
            },
            routes      : require('../routes.js')
        });

        app.urlGenerator = urlGenerator;
        app.generateUrl = function (name, params) {
            return urlGenerator.generate(name, params);
        };
    });
};