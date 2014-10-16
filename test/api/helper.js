'use strict';

var Q = require('q');
var extend = require('extend');

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
