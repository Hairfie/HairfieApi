'use strict';

var fbGraph = require('fbgraph');

module.exports = function (app) {
    app.fbGraph = fbGraph;
    app.fbGraph.setAccessToken(app.get('facebookAppAccessToken'));
};
