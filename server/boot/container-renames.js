'use strict';

var containerRenames = {
    'user-profile-pictures': 'users',
    'business-pictures': 'businesses',
};

module.exports = function (app) {
    var paths = [
        '/:version/containers/:container/upload',
        '/:version/containers/:container/download/:id'
    ];

    app.use(paths, function applyContainerRenames(req, res, next) {
        req.params.container = containerRenames[req.params.container] || req.params.container;
        next();
    });
};
