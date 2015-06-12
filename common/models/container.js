'use strict';

var _ = require('lodash');

module.exports = function (Container) {

    var containerRenames = {
        'business-pictures': 'businesses',
        'user-profile-pictures': 'users'
    };

    function applyContainerRenames(container) {
        return containerRenames[container] || container;
    }

    Container.upload = function (req, res, cb) {
        req.params.container = applyContainerRenames(req.params.container);

        var Image = Container.app.models.Image;

        Image.upload(req, res)
            .then(function (files) {
                return {
                    toRemoteObject: function (context) {
                        var obj = _.mapValues(files, function (f) { return f.toRemoteObject(context); });
                        if (context.isApiVersion('<1')) {
                            return {
                                result: {
                                    files: obj
                                }
                            };
                        }

                        return obj;
                    }
                };
            })
            .then(cb.bind(null, null), cb);
    };

    Container.download = function (container, id, width, height, res, cb) {
        var container = applyContainerRenames(container);

        var options = {};
        if (width || height) {
            options.crop = 'thumb';
            if (width) options.width = width;
            if (height) options.height = height;
        }

        var url = Container.app.models.CloudinaryImage.getUrl(container, id, options);

        res.redirect(url, 301);
        cb();
    };

    Container.remoteMethod('upload', {
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}},
            {arg: 'res', type: 'object', 'http': {source: 'res'}}
        ],
        returns: {root: true},
        http: {verb: 'post', path: '/:container/upload'}
    });

    Container.remoteMethod('download', {
        accepts: [
            {arg: 'container', type: 'string', 'http': {source: 'path'}},
            {arg: 'id', type: 'string', 'http': {source: 'path'}},
            {arg: 'width', type: 'string', description: 'Desired width'},
            {arg: 'height', type: 'string', description: 'Desired height'},
            {arg: 'res', type: 'object', 'http': {source: 'res'}}
        ],
        returns: {root: true},
        http: {verb: 'get', path: '/:container/download/:id'}
    });
}
