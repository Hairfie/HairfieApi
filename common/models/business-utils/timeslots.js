'use strict';

var Q = require('q');
var _ = require('lodash');
var moment = require('moment');
require('moment/locale/fr');
moment.locale('fr');

var publicHolidays = require("../../utils/PublicHolidays.js");
var days = require("../../utils/days.js");

module.exports = function (Business) {
    Business.timeslots = function (businessId, from, until, next) {
        var interval = 30; //60 Minutes between each timeslot
        var DEFAULT_DELAY = 24 + 4; //Numbers minimum hours before the first timeslots bookable

        if (moment(from) > moment(until))
            next({statusCode: 400, message: 'from must to be before until (time)'});

        if (moment(from) < moment())
            from = moment().format("YYYY-MM-DD");

        return Q.ninvoke(Business, 'findById', businessId)
            .then(function (business) {
                var timeslots = {};
                var day;
                var date;
                var i;

                var delay = this.timeslotDelta ||  DEFAULT_DELAY;

                for (i = 0; moment(from) <= moment(from).add(i, 'd') && moment(until) >= moment(from).add(i, 'd'); i++) {
                    date = moment(from).add(i, 'd').format("YYYY-MM-DD");

                    if (business.exceptions && business.exceptions[date]) {
                        day = business.exceptions[date];
                    }
                    else if (_.indexOf(publicHolidays, date) >= 0) {
                        day = [];
                    }
                    else {
                        day = moment(from).add(i, 'd').days();
                        day = days[day];
                        day = business.timetable && business.timetable[day];
                    }

                    if (delay <= 0) {
                        timeslots[date] = parseDay(day, interval);
                    }
                    else if (delay < 24 && !(_.isEmpty(day))) {
                        timeslots[date] = parseDay(day, interval, delay);
                        delay = 0;
                    }
                    else {
                        delay -= 24;
                    }
                }
                return timeslots;
            })
        next();
    };

    Business.remoteMethod('timeslots', {
        description: 'Get timeslots from timetable',
        accepts: [
            {arg: 'businessId', type: 'string', description: 'ID of the reference business'},
            {arg: 'from', type: 'string', description: 'start date'},
            {arg: 'until', type: 'string', description: 'end date'}
        ],
        returns: {arg: 'timeslots', root: true},
        http: { verb: 'GET', path: '/:businessId/timeslots' }
    });
};

function parseDay(day, interval, delay) {
    var newBattlements = [];
    _.map(day, function(timeslots) {
        var i;
        for (i = 0; moment(timeslots.endTime, "HH:mm") >= moment(timeslots.startTime, "HH:mm").add((i + 1) * interval, "m"); i++) {
            var delta = moment(timeslots.startTime, "HH:mm").add(i * interval, "m").diff(moment(timeslots.startTime, "HH:mm"), 'hours');

            if (!(delay && delay > delta))
                newBattlements.push({
                    startTime: moment(timeslots.startTime, "HH:mm").add(i * interval, "m").format("HH:mm"),
                    endTime: moment(timeslots.startTime, "HH:mm").add((i + 1) * interval, "m").format("HH:mm"),
                    discount: timeslots.discount || ""
                });
        }
    });
    return newBattlements;
}