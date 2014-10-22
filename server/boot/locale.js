'use strict';

var locale = require('locale');

module.exports = function (app) {
    var supportedLocales = app.get('locales'),
        defaultLocale    = supportedLocales[0];

    locale.Locale["default"] = defaultLocale;

    app.use(locale(supportedLocales));
};
