'use strict';

var containerRenames = {
    'user-profile-pictures': 'users',
    'business-pictures': 'businesses',
}

module.exports = function (app) {
    app.use([
        '/exp/containers/:container',
        '/api/containers/:container'
    ], function applyContainerRenames(req, res, next) {
        req.params.container = containerRenames[req.params.container] || req.params.container;
        next();
    });
};
