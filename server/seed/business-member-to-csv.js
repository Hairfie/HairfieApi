'use strict';

var app = require('../..');
var _ = require('lodash');
var q = require('q');
var csv = require('fast-csv');
var fs = require('fs');

var BusinessMember = app.models.BusinessMember;
var Business = app.models.Business;

var csvStream = csv.createWriteStream({headers: true}),
writableStream = fs.createWriteStream(__dirname + "/businessMember.csv");

writableStream.on("finish", function(){
    console.log("DONE!");
});

csvStream.pipe(writableStream);

findBusinessMembers()
    .then(function(businessMembers) {
        console.log(businessMembers);
        console.log("Found : ", businessMembers.length);

        return q.all(businessMembers.map(businessMemberToCSV.bind(csvStream)));
    })
    .then(function (results) {
        csvStream.end();
        console.log('Successfull.');
        process.exit(0);
    })
    .catch(function (error) {
        console.log('Failed :', error);
        process.exit(1);
    });

function findBusinessMembers() {
    return q.ninvoke(BusinessMember, 'find', {where: {active: true}});
}

function businessMemberToCSV(businessMember) {
    return q.ninvoke(Business, 'findOne', {where: {id: businessMember.businessId}})
        .then(function(business) {
            if (!business) return;
            csvStream.write({lastName: businessMember.lastName, firstName: businessMember.firstName, email: businessMember.email, business: business.name});
        });
}