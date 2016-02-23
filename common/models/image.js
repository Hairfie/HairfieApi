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

        if (context && context.isApiVersion('<1')) {
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
            thumbUrl    : this.getThumbUrl(),
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

    Image.prototype.getThumbUrl = function (image) {
        return Image.app.models.CloudinaryImage.getThumbUrl(this.container, this.id);
    };

    Image.upload = function (req, res) {
        var AmazonS3Image   = Image.app.models.AmazonS3Image;
        var CloudinaryImage = Image.app.models.CloudinaryImage;

        return AmazonS3Image.uploadFromRequest(req, res)
            .then(function (files) {
                var pairs    = _.pairs(files);
                var promises = _.map(_.map(pairs, 1), processAmazonS3Image);

                return Q.all(promises).then(function (images) {
                    // rebuild field-to-image map
                    return _.zipObject(_.map(pairs, 0), images);
                });
            });
    };

    Image.uploadFromAmazonS3 = function (oldContainer, oldName, newContainer) {
        var AmazonS3Image   = Image.app.models.AmazonS3Image;
        var CloudinaryImage = Image.app.models.CloudinaryImage;

        return AmazonS3Image.uploadFromContainer(oldContainer, oldName, newContainer).then(processAmazonS3Image);
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

    function processAmazonS3Image(file) {
        var AmazonS3Image   = Image.app.models.AmazonS3Image;
        var KrakenImage     = Image.app.models.KrakenImage;
        var CloudinaryImage = Image.app.models.CloudinaryImage;

        return AmazonS3Image
            .getDownloadUrl(file.container, file.id)
            .then(function (sourceUrl) {
                return KrakenImage.optimize(file.id, sourceUrl);
            })
            .then(function (optimizedUrl) {
                return CloudinaryImage.uploadFromUrl(file.container, file.id, optimizedUrl);
            })
            .then(function (result) {
                return Image.createFromCloudinaryImage(file.container, file.id, result);
            });
    }
};
