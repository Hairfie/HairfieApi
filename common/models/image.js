'use strict';

var _ = require('lodash');
var Q = require('q');
var Uuid = require('uuid');
var Hooks = require('./hooks');

module.exports = function (Image) {
    Hooks.updateTimestamps(Image);

    Image.prototype.toRemoteObject =
    Image.prototype.toRemoteShortObject = function (context) {
        var CloudinaryImage = Image.app.models.CloudinaryImage;

        if (context.isMobile()) {
            return {
                container   : this.container,
                name        : this.id,
                url         : Image.app.urlGenerator.generate('pictureDownload', {
                    container   : this.container,
                    name        : this.id
                })
            };
        }

        return {
            id          : this.id,
            container   : this.container,
            url         : this.getUrl(),
            secureUrl   : this.getSecureUrl(),
            cloudinary  : {
                cloudName       : CloudinaryImage.getCloudName(),
                publicId        : CloudinaryImage.getPublicId(this.container, this.id),
                type            : CloudinaryImage.getType(this.container),
                transformation  : CloudinaryImage.getTransformations(this.container)
            }
        }
    };

    Image.prototype.getUrl = function (image) {
        return Image.app.models.CloudinaryImage.getUrl(this.container, this.id);
    };

    Image.prototype.getSecureUrl = function (image) {
        return Image.app.models.CloudinaryImage.getUrl(this.container, this.id, {secure: true});
    };

    Image.upload = function (req, res) {
        var AmazonS3Image   = Image.app.models.AmazonS3Image;
        var CloudinaryImage = Image.app.models.CloudinaryImage;

        return AmazonS3Image.uploadFromRequest(req, res)
            .then(function (files) {
                var pairs = _.pairs(files);

                var promises = _.map(_.pluck(pairs, 1), function (file) {
                    return AmazonS3Image
                        .getDownloadUrl(file.container, file.id)
                        .then(function (url) {
                            return CloudinaryImage.uploadFromUrl(file.container, file.id, url);
                        })
                        .then(function (result) {
                            return Image.createFromCloudinaryImage(file.container, file.id, result);
                        });
                });

                return Q.all(promises).then(function (images) {
                    // rebuild field-to-image map
                    return _.zipObject(_.pluck(pairs, 0), images);
                });
            });
    };

    Image.uploadFromAmazonS3 = function (oldContainer, oldName, newContainer) {
        var AmazonS3Image   = Image.app.models.AmazonS3Image;
        var CloudinaryImage = Image.app.models.CloudinaryImage;

        return AmazonS3Image.uploadFromContainer(oldContainer, oldName, newContainer)
            .then(function (file) {
                return AmazonS3Image
                    .getDownloadUrl(file.container, file.id)
                    .then(function (url) {
                        return CloudinaryImage.uploadFromUrl(file.container, file.id, url);
                    })
                    .then(function (result) {
                        return Image.createFromCloudinaryImage(file.container, file.id, result);
                    });
            });
    };

    Image.createFromCloudinaryImage = function (container, id, cloudinaryImage) {
        var deferred = Q.defer();

        Image.create({
            id          : id,
            container   : container,
            cloudinary  : _.pick(cloudinaryImage, [
                'signature',
                'etag',
                'width',
                'height',
                'bytes',
                'faces',
                'image_metadata',
                'colors',
                'predominant',
                'phash'
            ])
        }, function (error, image) {
            if (error) deferred.reject(error);
            else deferred.resolve(image);
        });

        return deferred.promise;
    };

    Image.instanceFromFacebookId = function (facebookId) {
        return new Image({
            id          : facebookId,
            container   : 'facebook'
        });
    };
};
