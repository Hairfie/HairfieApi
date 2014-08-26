/**
 * Run `node import.js business-data-sample.json` to import the  data into the db.
 */

var async = require('async');


if(process.argv[2]) {
    var businesses = require(process.argv[2]).reverse();
    console.log("Importing " + process.argv[2] + "...");
} else {
    var businesses = require('./businesses-data-sample.json');
}

module.exports = function(app, cb) {
    var Business = app.models.Business;
    var db = app.dataSources.hairfieMongo;

    var SearchEngine = app.models.SearchEngine;

    console.log('Droping search index');
    SearchEngine
        .dropIndex()
        .then(function () {
            console.log('Creating search index');
            return SearchEngine.createIndex();
        })
        .then(function () {
            console.log('Defining search mapping')
            return SearchEngine.defineMapping('business', {
                business: {
                    properties: {
                        name: {
                            type: 'string'
                        },
                        gps: {
                            type: 'geo_point',
                            lat_lon: true,
                            geohash: true
                        }
                    }
                }
            });
        })
        .then(function () {
            console.log('Importing businesses');

            function importBusinesses(data, cb) {
                async.each(data, function(d, callback) {
                    var business = {
                        name: d.name,
                    gps: d.gps,
                    street: d.street,
                    city: d.city,
                    zipcode: d.zipcode,
                    siren: d.siren,
                    siret: d.siret,
                    phone_numbers: d.phone_pj,
                    diane_data: d.diane_data,
                    pj_data: d.pages_jaunes,
                    timetables: parseTimetables(d.timetables_pj)
                    };
                    //console.log(business);
                    Business.create(business, callback);
                }, cb);
            }

            async.series([
                function(cb) {
                    db.autoupdate(cb);
                },

                importBusinesses.bind(null, businesses)
            ], function(err/*, results*/) {
                cb(err);
            });
        })
    ;

};

function parseTimetables(timetables) {
    if (!timetables) return;

    for (var day in timetables) if (timetables.hasOwnProperty(day)) {
        if (!Array.isArray(timetables[day])) timetables[day] = [timetables[day]];

        timetables[day] = timetables[day].map(function (period) {
            var parts = period.split(' - ');
            return {from: parts[0], to: parts[1] };
        });
    }

    return timetables;
}

if (require.main === module) {
    module.exports(require('../../'), function(err) {
        if (err) {
            console.error('Cannot import sample data - ', err);
        } else {
            console.log('Data was imported.');
        }
    });
}
