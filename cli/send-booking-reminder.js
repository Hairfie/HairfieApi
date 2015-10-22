'use strict';

var Promise = require('../common/utils/Promise');

var moment = require('moment');
moment.locale('fr');

module.exports = function (program, app) {
    program
        .command('send-booking-reminder')
        .description('Sends a reminder by sms')
        .action(function (options) {
            var Booking = app.models.Booking;
            var times = {};

            if (moment() <= moment().hours(12).startOf('hours')) { //SI ON EST LE MATIN
                //On envoie les msg pour l'après midi
                times = {
                    start: moment().hours(12).startOf('hours').toISOString(),
                    end: moment().endOf('days').toISOString()
                };
            } else {
                //On envoie les messages pour le lendemain matin
                times = {
                    start: moment().add(1, 'days').startOf('days').toISOString(),
                    end: moment().add(1, 'days').startOf('days').hours(12).toISOString()
                };
            }

            console.log(times);
            Promise.ninvoke(Booking, 'find', {where: { and: [ { dateTime: { gte: times.start } }, { dateTime: { lte: times.end } } ]}})
                .then(function (bookings) {
                    console.log("reminder to send", bookings.length);
                    return Promise.all(bookings.map(sendBookingReminder.bind(null, app)));
                })
                .then(onSuccess, onFailure);
        });
};

function sendBookingReminder(app, booking) {
    var Business = app.models.Business;
    var Email = app.models.Email;

    console.log('Sending booking '+booking.id+' to '+booking.email);

    return Promise.ninvoke(Business, 'findOne', {where: {id: booking.businessId}})
        .then(function (business) {
            if (!business) throw new Error("Business not found");

            return Email.reminderBooking(booking, business);
        })
        .then(function () {
            booking.emailSentAt = new Date();

            return Promise.npost(booking, 'save');
        })
        .fail(function (error) {
            console.log('Failed to send '+booking.id+':', error);
        });
}

function onSuccess() {
    process.exit(0);
}

function onFailure(error) {
    console.error(error);
    process.exit(1);
}