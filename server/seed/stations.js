'use strict';

var app = require('../..');
var Promise = require('../../common/utils/Promise');
var q = require('q');
var csv = require("fast-csv");
var fs = require('fs');

var Station = app.models.Station;
var stationsCSV = '/ratp_arret_graphique_01.csv';

Promise.denodeify(parseCSV)(stationsCSV)
    .then(function(results) {
        return results;
    })
    .then(saveStations)
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
            var obj = {
                ratpId: data[0],
                gps: {
                    lat: Number(data[2]),
                    lng: Number(data[1])
                },
                name: data[3],
                city: data[4],
                type: data[5]
            }
            if(obj.gps.lng > 180) {
                console.log("Impossible to import :", obj);
            } else {
                output.push(obj);
            }
        })
        .on('end', function(){
            return callback(null, output);
        });
}

function saveStations(stationsDefinition) {
    return q.all(stationsDefinition.map(saveStation));
}

function saveStation(stationDefinition) {
    return q.ninvoke(Station, 'findOrCreate', {where: {ratpId: stationDefinition.ratpId}}, {
        ratpId: stationDefinition.ratpId,
        gps: {
            lat: stationDefinition.gps.lat,
            lng: stationDefinition.gps.lng
        },
        name: stationDefinition.name,
        city: stationDefinition.city,
        type: stationDefinition.type
    });
}