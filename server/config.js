'use strict';

var _ = require('lodash');

module.exports = {
    url: process.env.URL,
    host: process.env.HOST,
    webUrl: process.env.WEB_URL,
    cdnUrl: process.env.CDN_URL,
    restApiRoot: '/api',
    legacyExplorer: false,
    locales: commaSeparated(process.env.LOCALES),
    salesEventEmail: process.env.SALES_EVENT_EMAIL,
    eventStreamEmail: process.env.EVENT_STREAM_EMAIL,
    emailFrom: process.env.EMAIL_FROM,
    emailBcc: process.env.EMAIL_BCC,
    adminIds: commaSeparated(process.env.ADMIN_IDS),
    googleApiKey: process.env.GOOGLE_API_KEY,
    iosAppUrl: process.env.IOS_APP_URL,
    facebookAppAccessToken: process.env.FACEBOOK_APP_ACCESS_TOKEN
};

function commaSeparated(s) {
    if (_.isUndefined(s) || '' === s) return [];

    return _.map((s || '').split(','), _.trim);
}
