'use strict';

var Q = require('q');
var Kraken = require('kraken');
var AWS = require('aws-sdk');

module.exports = function (KrakenImage) {
    var kraken;
    var s3;

    KrakenImage.on('dataSourceAttached', function () {
        kraken = new Kraken({
            api_key     : KrakenImage.dataSource.settings.apiKey,
            api_secret  : KrakenImage.dataSource.settings.apiSecret
        });

        s3 = new AWS.S3({
            accessKeyId     : KrakenImage.dataSource.settings.awsKey,
            secretAccessKey : KrakenImage.dataSource.settings.awsSecret,
            region          : KrakenImage.dataSource.settings.awsS3Region
        });
    });

    /**
     * Optimizes an image using kraken.io and returns an URL where the resulting
     * image can be downloaded.
     */
    KrakenImage.optimize = function (id, url) {
        var deferred = Q.defer();
        var options = {
            url     : sourceUrl,
            lossy   : true,
            wait    : true,
            dev     : !!KrakenImage.dataSource.settings.sandbox,
            s3_store: {
                key     : KrakenImage.dataSource.settings.awsKey,
                secret  : KrakenImage.dataSource.settings.awsSecret,
                bucket  : KrakenImage.dataSource.settings.awsS3Bucket,
                region  : KrakenImage.dataSource.settings.awsS3Region,
                path    : id+'-lossy'
            }
        };

        kraken.url(options, function (data) {
            if (!data.success) return deferred.reject(data.error);

            var params = {
                Bucket  : KrakenImage.dataSource.settings.awsS3Bucket,
                Key     : options.path
            };

            s3.getSignedUrl('getObject', params, function (error, url) {
                if (error) return deferred.reject(error);
                deferred.resolve(url);
            });

        });

        return deferred.promise;
    };
};
