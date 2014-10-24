'use strict';

var fbGraph = require('fbgraph');

module.exports = function (app) {
    app.fbGraph = fbGraph;
    app.fbGraph.setVersion('2.1');
    app.fbGraph.setAccessToken(app.get('facebookAppAccessToken'));
};
