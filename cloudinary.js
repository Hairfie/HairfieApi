'use strict';

var Q = require('q');
var _ = require('lodash');
var app = require('./');


var Business = app.models.Business;
var BusinessMember = app.models.BusinessMember;

return Q.ninvoke(model('Business'), 'findById', 'noop')
    .then(step('Rename old images properties', parallel([
        rename('User', 'picture'),
        rename('Business', 'pictures'),
        rename('BusinessMember', 'picture'),
        rename('Hairfie', 'pictures'),
        rename('Category', 'picture'),
        rename('Place', 'picture')
    ])))
    .then(step('Update users', updateAll('User', 'picture', 'user-profile-pictures', 'users')))
    .then(step('Update businesses', updateAll('Business', 'pictures', 'business-pictures', 'businesses')))
    .then(step('Update business members', updateAll('BusinessMember', 'picture', 'business-pictures', 'business-members')))
    .then(step('Update hairfies', updateAll('Hairfie', 'pictures', 'hairfies')))
    .then(step('Update categories', updateAll('Category', 'picture', 'category', 'categories')))
    .then(step('Update places', updateAll('Place', 'picture', 'places')))
    .then(function () {
        process.exit(0);
    }, function (error) {
        console.log(error);
        process.exit(1);
    });


function model(name) { return app.models[name]; }
function collection(Model) { return Model.dataSource.connector.collection(Model.definition.name); }

function step(name, action) {
    return function () {
        console.log('----> '+name);
        return Q(action());
    };
}

function parallel(actions) {
    return function () {
        return Q.all(_.map(actions, function (a) { return a();}));
    };
}

function rename(modelName, property) {
    return function () {
        var deferred = Q.defer();
        var rename = {};
        rename[property] = 'old_'+property;
        collection(model(modelName)).update({}, {$rename: rename}, {multi: true}, function (error) {
            if (error) deferred.reject(error);
            else deferred.resolve();
        });

        return deferred.promise;
    };
}

function update(property, oldContainer, newContainer) {
    newContainer = newContainer || oldContainer;
    return function (model) {
        var one = 'picture' == property;
        var old = model['old_'+property];
        old = _.isArray(old) ? old : new Array(old);
        old = _.filter(old, function (n) {
            return _.isString(n) && !_.startsWith(n, 'http:');
        });
        if (one) old = old.slice(0, 1);

        if (old.length == 0) return Q();

        return Q.all(_.map(old, upload(oldContainer, newContainer)))
            .then(function (files) {
                if (one) model[property] = _.first(files);
                else model[property] = files;

                return Q.npost(model, 'save');
            })
            .catch(function (error) {
                console.log(model.id, 'failed: ', error);
            });
    }
}

function updateAll(modelName, property, oldContainer, newContainer) {
    var filter = {where: {}};
    filter.where['old_'+property] = {exists: true, ne: null, not: {size: 0}};

    return function () {
        return find(modelName, filter).then(function (items) {
            return Q.all(_.map(items, update(property, oldContainer, newContainer)));
        });
    }
}

function upload(oldContainer, newContainer) {
    return function (oldName) {
        return model('Image').uploadFromAmazonS3(oldContainer, oldName, newContainer);
    };
}

function find(modelName, filter) {
    var deferred = Q.defer();

    model(modelName).find(filter, function (error, results) {
        if (error) deferred.reject(error);
        else deferred.resolve(results);
    });

    return deferred.promise;
}
