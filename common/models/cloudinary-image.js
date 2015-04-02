'use strict';

var Q = require('q');
var cloudinary = require('cloudinary');

module.exports = function (CloudinaryImage) {

    CloudinaryImage.on('dataSourceAttached', function () {
        cloudinary.config({
            cloud_name  : CloudinaryImage.dataSource.settings.cloudName,
            api_key     : CloudinaryImage.dataSource.settings.apiKey,
            api_secret  : CloudinaryImage.dataSource.settings.apiSecret
        });
    });

    function containerFolder(container) {
        var folder = CloudinaryImage.dataSource.settings.folders[container];
        if (!folder) throw new Error('No folder configured for container "'+container+'".');
        return folder;
    }

    CloudinaryImage.getPublicId = function (container, id) {
        return containerFolder(container)+'/'+id;
    };

    CloudinaryImage.getUrl = function (container, id, options) {
        return cloudinary.url(CloudinaryImage.getPublicId(container, id), options);
    };

    CloudinaryImage.uploadFromUrl = function (container, id, url) {
        var deferred = Q.defer();
        var options  = {
            public_id       : CloudinaryImage.getPublicId(container, id),
            colors          : true,
            image_metadata  : true,
            faces           : true,
            phash           : true,
        };

        cloudinary.uploader.upload(url, function (result) {
            if (result.error) deferred.reject(result.error);
            else deferred.resolve(result);
        }, options);

        return deferred.promise;
    };

};
