'use strict';

var app = require('../..');

var Promise = require('../../common/utils/Promise');

var User           = app.models.user,
    Hairfie        = app.models.Hairfie,
    Business       = app.models.Business,
    BusinessMember = app.models.BusinessMember;

console.log('Step 1: Creating business member for business managers');
businessesHavingManagerIds()
    .then(function (businesses) {
        console.log('found', businesses.length, 'business(es)');
        return map(businesses, processBusiness);
    })
    .then(function () {
        console.log('Step 2: Creating business member for hairdressers & reattaching hairfies');
        return allHairdressers();
    })
    .then(function (hairdressers) {
        return map(hairdressers, processHairdresser);
    })
    .then(function () {
        console.log('Step 3: Renaming favorite collection');
        return renameCollection('haidresserFavorites', 'businessMemberFavorites');
    })
    .then(function () {
        console.log('Success!');
        process.exit(0);
    })
    .fail(function (error) {
        console.log('Failure:', error);
        process.exit(1);
    });


function businessesHavingManagerIds() {
    return find('businesses', {managerIds: {$exists: true}});
}

function allHairdressers() {
    return find('hairdressers', {});
}

function hairfiesByHairdresser(hairdresser) {
    return find('hairfies', {hairdresserId: hairdresser._id});
}

function processBusiness(business) {
    return getUsers(business.managerIds)
        .then(function (users) {
            return Promise.all(users.map(createBusinessMemberForUserIfNecessary.bind(null, business)));
        });
}

function processHairdresser(hairdresser) {
    var criteria = {};
    criteria.businessId = hairdresser.businessId;
    criteria.firstName = hairdresser.firstName;
    criteria.lastName = hairdresser.lastName;

    return findOne('businessMembers', criteria)
        .then(function (bm) {
            if (bm) return bm;

            var bm = {};
            bm.businessId = hairdresser.businessId;
            bm.firstName = hairdresser.firstName;
            bm.lastName = hairdresser.lastName;
            bm.email = hairdresser.email;
            bm.phoneNumber = hairdresser.phoneNumber;
            bm.active = true;
            bm.hidden = false;

            return createBusinessMember(bm);
        })
        .then(function (bm) {
            var cr = {hairdresserId: hairdresser._id, businessMemberId: {$exists: false}};
            var up = {$set: {businessMemberId: bm._id}};
            return Promise.all([
                update('hairfies', cr, up, {multi: true}),
                update('haidresserFavorites', cr, up, {multi: true})
            ]);
        });
}

function map(items, fun) {
    return Promise.all(items.map(fun));
}

function getUsers(ids) {
    return Promise.npost(User, 'findByIds', [ids]);
}

function createBusinessMemberForUserIfNecessary(business, user) {
    var where = {};
    where.businessId = business._id;
    where.userId = user.id;

    findOne('businessMembers', where)
        .then(function (bm) {
            if (bm) console.log('exists');
            else {
                var bm = {};
                bm.businessId = where.businessId;
                bm.userId = where.userId;
                bm.firstName = user.firstName;
                bm.lastName = user.lastName;
                bm.hidden = true;
                bm.active = true;

                return createBusinessMember(bm)
                    .then(function () { console.log('created'); });
            }
        });
}

function createBusinessMember(values) {
    values.createdAt = new Date();
    values.updatedAt = new Date();
    return collection('businessMembers')
        .then(function (collection) {
            return Promise
                .npost(collection, 'insert', [values, {w: 1}])
                .then(function (records) { return records[0]; });
        });
}

function update(model, criteria, update, options) {
    return collection(model)
        .then(function (col) {
            var args = [criteria, update];
            if (options) args.push(options);

            return Promise.npost(col, 'update', args);
        });
}

function findOne(collectionName, query, fields) {
    return collection(collectionName)
        .then(function (collection) {
            var deferred  = Promise.defer();

            collection
                .findOne(query, fields || {}, function (error, result) {
                    if (error) deferred.reject(error);
                    else deferred.resolve(result);
                });

            return deferred.promise;
        });
}

function find(collectionName, query, fields) {
    return collection(collectionName)
        .then(function (collection) {
            var deferred  = Promise.defer();

            collection
                .find(query, fields || {})
                .toArray(function (err, results) {
                    if (err) deferred.reject(err);
                    else deferred.resolve(results);
                });

            return deferred.promise;
        });
}

function renameCollection(fromName, toName) {
    return collection(fromName)
        .then(function (collection) {
            return Promise.npost(collection, 'rename', [toName]);
        });
}

function collection(name) {
    var deferred  = Promise.defer(),
        connector = Business.dataSource.connector;

    connector.connect(function () {
        deferred.resolve(connector.db.collection(name));
    });

    return deferred.promise;
}
