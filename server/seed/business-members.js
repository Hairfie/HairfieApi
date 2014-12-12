'use strict';

var app = require('../..');

var Promise = require('../../common/utils/Promise');

var User           = app.models.user,
    Business       = app.models.Business,
    BusinessMember = app.models.BusinessMember;


var query = {managerIds: {$not: {$size: 0}}};

var connector = Business.dataSource.connector;
connector.connect(function () {
    console.log('connected');
    var collection = connector.collection(Business.definition.name);

    collection.find(query, {_id: true, managerIds: true}).toArray(function (err, businesses) {
        console.log('found', businesses.length, 'business(es)');

        processBusinesses(businesses)
            .then(function () {
                console.log('done');
                process.exit(0);
            })
            .fail(function (error) {
                console.log('failed:', error);
                process.exit(1);
            });
    });
});

function processBusinesses(businesses) {
    return Promise.all(businesses.map(processBusiness));
}

function processBusiness(business) {
    return getUsers(business.managerIds)
        .then(function (users) {
            return Promise.all(users.map(createBusinessMemberIfNecessary.bind(null, business)));
        });
};

function getUsers(ids) {
    return Promise.npost(User, 'findByIds', [ids]);
};

function createBusinessMemberIfNecessary(business, user) {
    var where = {};
    where.businessId = business._id;
    where.userId = user.id;

    return Promise.npost(BusinessMember, 'findOne', [{where: where}])
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

                var col = connector.collection(BusinessMember.definition.name);

                return Promise.npost(col, 'insert', [bm])
                    .then(function () {
                        console.log('created');
                    });
            }
        });
};
