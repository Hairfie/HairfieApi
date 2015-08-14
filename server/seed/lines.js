'use strict';

var app = require('../..');
var Promise = require('../../common/utils/Promise');
var q = require('q');
var csv = require("fast-csv");
var fs = require('fs');
var _ = require('lodash');

var Station = app.models.Station;
var linesCSV = '/ratp_arret_ligne_01.csv';

Promise.denodeify(parseCSV)(linesCSV)
    .then(function(results) {
        var obj = _.groupBy(results, "ratpId");
        return obj;
    })
    .then(insertLines)
    .then(function () {
        console.log('Successfully seeded places.');
        process.exit(0);
    })
    .catch(function (error) {
        console.log('Failed to seed places:', error);
        process.exit(1);
    });

function parseCSV(file, callback) {
    var stream = fs.createReadStream(__dirname+file),
        output = [];

    csv
        .fromStream(stream, {delimiter : '#'})
        .on('data', function(data){
            var matches = data[1].match(/(^\S+)(.+)/);
            var name = matches[2].replace('(', '').replace(')', '');
            var line = {
                ratpId: data[0],
                number: matches[1],
                name: name,
                type: data[2]
            };
            output.push(line)
        })
        .on('end', function(){
            return callback(null, output);
        });
}

function insertLines(linesDefinition) {
    var funcs = _.map(linesDefinition, function (lineDefinition) {
        return {func: insertLine, arg: lineDefinition};
    });

    var result = q(funcs[0].func(funcs[0].arg));
    funcs.forEach(function (f) {
        result = result.then(f.func(f.arg));
    });
    return result;
}

function insertLine(lineDefinition) {
    var ratpId = lineDefinition[0].ratpId;
    _.map(lineDefinition, function (obj) {
        delete obj.ratpId;
    });

    return q.ninvoke(Station, 'find', {where: {ratpId: ratpId}})
        .then(function (stations) {
            return q.all(stations.map(function (station) {
                return q.ninvoke(station, 'updateAttributes', {lines: lineDefinition});
            }));
        });
}