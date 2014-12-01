var app = require('../..');
var q = require('q');
var Business = app.models.Business;

findClaimedBusinesses()
    .then(function(businesses) {
        return q.all(businesses.map(updateBusiness));
    })
    .then(function () {
        console.log('Successfull.');
        process.exit(0);
    })
    .catch(function (error) {
        console.log('Failed to seed tags:', error);
        process.exit(1);
    });

function findClaimedBusinesses() {
    return q.ninvoke(Business, 'find', {where: {ownerId: {neq: null}}});
}

function updateBusiness(business) {
    console.log("updateBusiness");
    return q.npost(Business, 'update', [{
        id       : business.id,
        managerIds : [business.ownerId.toString()]
    }]);
}