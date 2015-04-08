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
        var key = id+'-lossy';
        var options = {
            url     : url,
            lossy   : true,
            wait    : true,
            s3_store: {
                key     : KrakenImage.dataSource.settings.awsKey,
                secret  : KrakenImage.dataSource.settings.awsSecret,
                bucket  : KrakenImage.dataSource.settings.awsS3Bucket,
                region  : KrakenImage.dataSource.settings.awsS3Region,
                path    : key
            }
        };

        kraken.url(options, function (data) {
            if (!data.success) return deferred.reject(data.error);
            deferred.resolve(data.kraked_url);
        });

        return deferred.promise;
    };
};
