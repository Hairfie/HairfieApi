'use strict';

var _ = require('lodash');
var Q = require('q');

var friendlyIds = require('./friendlyIds.json');

var app = require('../..');

Q()
    .then(migrateBusinesses)
    .then(function () {
        process.exit(0);
    }, function (e) {
        console.log('Error:', e.stack);
        process.exit(1);
    });


function migrateBusinesses() {

    function migrateBusiness(business) {
        return changeId(app.models.Business, business)
            .then(function (business) {
                console.log("business updated", business.id + ' : ' + business.name);
                return business;
            });
    }

    var chunkSize = 200;

    return Q.ninvoke(app.models.Business, 'count')
        .then(function (total) {
            var loop = function (skip) {
                console.log("total :", total);
                console.log("skip : ", skip);
                return Q.ninvoke(app.models.Business, 'find', {limit: chunkSize, skip: skip, where: {friendlyId: null} })
                    .then(function (businesses) {
                        return all(migrateBusiness)(businesses)
                            .then(function () {
                                return businesses.length < chunkSize ? null : loop(skip + chunkSize);
                            });
                    });
            };

            return loop(0);
        });

    return find(app.models.Business)
}
function changeId(Model, model) {
    if (model.friendlyId) return Q.resolve(model); // already defined

    model.friendlyId = friendlyIds[model.id].friendlyId;//Math.floor(Math.random()*90000) + 10000;

    return save(model)
        .then(function () {
            return model;
        });
}

function all(fn) {
    return function (items) {
        return Q.all(items.map(fn));
    };
}

function find(Model, filter) {
    return Q.ninvoke(Model, 'find', filter);
}

function log(message) {
    return function () {
        console.log(message);
        return Q.resolve();
    };
}

function save(model) {
    return Q.ninvoke(model, 'save', {validate: false});
}

function collection(Model) {
    return Model.dataSource.connector.collection(Model.definition.name);
}

function objectId(Model, val) {
    return new Model.dataSource.ObjectID(val);
}

function update(Model, where, update) {
    return Q.ninvoke(collection(Model), 'update', where, update, {multi: true});
}
