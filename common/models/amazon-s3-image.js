'use strict';

var Q = require('q');
var _ = require('lodash');
var Uuid = require('uuid');

module.exports = function (AmazonS3Image) {
    var allowedContentTypes = ['image/jpeg'];

    function s3() { return AmazonS3Image.dataSource.connector.client.s3; };

    function containerBucket(container) {
        var bucket = AmazonS3Image.dataSource.settings.buckets[container];
        if (!bucket) throw new Error('No bucket configured for container "'+container+'".');
        return bucket;
    }

    function idToFilename(x) { return x+'.jpg'; }
    function idFromFilename(x) { return x.split('.')[0]; }
    function getFilename() { return idToFilename(Uuid.v4()); };

    AmazonS3Image.uploadFromRequest = function (req, res) {
        var container = req.params.container;
        var bucket    = containerBucket(container);
        var options   = {
            container           : bucket, // for the connecter container == bucket
            getFilename         : getFilename,
            //allowedContentTypes : allowedContentTypes
        };

        return Q.nfcall(AmazonS3Image.upload, req, res, options)
            .then(function (result) {
                // the files needs time on S3 before it becomse available for download
                // operations
                // TODO: get rid of this hardcoded timeout
                var deferred = Q.defer();
                setTimeout(function () { deferred.resolve(result); }, 1000);
                return deferred.promise;
            })
            .then(function (result) {
                return _.mapValues(result.files, function (file) {
                    return {
                        container   : container,
                        id          : idFromFilename(file[0].name)
                    };
                });
            });
    };

    AmazonS3Image.uploadFromContainer = function (oldContainer, oldFilename, newContainer) {
        var oldBucket = containerBucket(oldContainer);
        var newBucket = containerBucket(newContainer);
        var newFilename = getFilename();

        var params   = {
            Bucket      : newBucket,
            CopySource  : oldBucket+'/'+oldFilename,
            Key         : newFilename
        };

        return Q.nfcall(s3().copyObject.bind(s3()), params)
            .then(function (r) {
                var result = {container: newContainer, id: idFromFilename(newFilename)};

                var deferred = Q.defer();
                setTimeout(function () { deferred.resolve(result); }, 1000);
                return deferred.promise;
            });
    };

    AmazonS3Image.getDownloadUrl = function (container, id) {
        var params   = {
            Bucket  : containerBucket(container),
            Key     : idToFilename(id)
        };

        return Q.nfcall(s3().getSignedUrl.bind(s3()), 'getObject', params);
    };

};
