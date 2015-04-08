'use strict';

var Q = require('q');
var _ = require('lodash');
var app = require('./');


/**
 * for each existing image
 *      optimize
 *      upload on new cloudinary
 */

find(model('Image'))
    .then(function (images) {
        return throttle(images, 4, moveImage);
    })
    .then(
        function () {
            process.exit(0);
        },
        function (error) {
            console.log(error);
            process.exit(1);
        }
    );

function moveImage(image) {
    return model('AmazonS3Image')
        .getDownloadUrl(image.container, image.id)
        .then(model('KrakenImage').optimize)
        .then(model('CloudinaryImage').uploadFromUrl.bind(model('CloudinaryImage'), image.container, image.id))
        .catch(function (error) { console.log(image.id, 'failed:', error); });
}

function find(Model) {
    var deferred = Q.defer();
    Model.find({}, function (error, items) {
        if (error) deferred.reject(error);
        else deferred.resolve(items);
    });
    return deferred.promise;
}

function model(name) { return app.models[name]; }
function collection(Model) { return Model.dataSource.connector.collection(Model.definition.name); }

function throttle(values, max, iterator) {
    max = max -1;
    var deferred = Q.defer();
    var list = _.clone(values).reverse();
    var outstanding = 0;

    function catchingFunction(value){
        deferred.notify(value);
        outstanding--;
        if(list.length){
            outstanding++;
            iterator(list.pop())
                .then(catchingFunction)
                .fail(rejectFunction);
        }
        else if(outstanding===0){
            deferred.resolve();
        }
    }

    function rejectFunction(err) {
        deferred.reject(err);
    }

    while(max-- && list.length){
        iterator(list.pop())
            .then(catchingFunction)
            .fail(rejectFunction);
        outstanding++;
    }

    return deferred.promise;
};
