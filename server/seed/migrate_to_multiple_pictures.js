var app = require('../..');
var q = require('q');
var Hairfie = app.models.Hairfie;
var lodash = require('lodash');

findHairfieWithSinglePicture()
    .then(function(hairfies) {
        console.log(hairfies);
        console.log("Found : ", hairfies.length);
        return q.allSettled(hairfies.map(updateHairfie));
    })
    .then(function (results) {
        console.log('Successfull.');
        process.exit(0);
    })
    .catch(function (error) {
        console.log('Failed to migrate pictures:', error);
        process.exit(1);
    });

function findHairfieWithSinglePicture() {
    return q.ninvoke(Hairfie, 'find', {where: {picture: /\S/}});
}

function updateHairfie(hairfie) {
    var pictures = [hairfie.picture];
    return q.ninvoke(hairfie, 'updateAttributes', {pictures : pictures});
}