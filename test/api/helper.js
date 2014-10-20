'use strict';

var Q = require('q');
var extend = require('extend');
var http = require('http');
var fs = require("fs");
var md5 = require('MD5');
var crypto = require('crypto');

function Helper(app) {
    if (!this) return new Helper(app);

    if ('test' !== process.env.NODE_ENV) throw "Only allowed in 'test' env.";

    this.app = app;
}

module.exports = Helper;

Helper.prototype.clearEverything = function (callback) {
    var models = this.app.models.User.dataSource.connector._models;

    return Q.all(Object.keys(models).map(function (modelName) {
        return Q.npost(models[modelName].model, 'destroyAll');
    }));
};

Helper.prototype.createUser = function (values) {
    var values = extend({
        gender      : 'MALE',
        firstName   : 'George',
        lastName    : 'Abitbol',
    }, values || {});

    if (!values.email) {
        values.email = values.firstName.toLowerCase()+'.'+values.lastName.toLowerCase()+'@gmail.com';
    }

    if (!values.password) {
        values.password = values.firstName.toLowerCase()+'pass';
    }

    return Q.npost(this.app.models.User, 'create', [values]);
};

Helper.prototype.createAccessTokenForUser = function (user) {
    return Q.npost(this.app.models.accessToken, 'create', [{userId: user.id}]);
};

Helper.prototype.createHairfie = function (values) {
    var values  = values || {};

    return Q(values.picture || this.uploadPicture('hairfies', 'hairfie.jpg'))
        .then((function (picture) {
            values.picture = picture;

            return Q.npost(this.app.models.Hairfie, 'create', [values]);
        }).bind(this));
};

Helper.prototype.createHairfieLikeForUserAndHairfie = function (user, hairfie) {
    return Q.npost(this.app.models.HairfieLike, 'create', [{userId: user.id, hairfieId: hairfie.id}]);
};

Helper.prototype.uploadPicture = function (container, assetName) {
    var deferred     = Q.defer(),
        targetName   = md5(crypto.randomBytes(256))+'.'+/(?:\.([^.]+))?$/.exec(assetName)[1],
        assetStream  = fs.createReadStream(__dirname+'/../assets/'+assetName),
        uploadStream = this.app.models.Container.uploadStream(container, targetName);

    assetStream.on('end', function () {
        deferred.resolve(targetName);
    });

    assetStream.pipe(uploadStream);

    return deferred.promise;
};
