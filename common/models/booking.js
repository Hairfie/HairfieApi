'use strict';

var Promise = require('../../common/utils/Promise');
var moment = require('moment');

module.exports = function (Booking) {
    Booking.GENDER_MALE = 'MALE';
    Booking.GENDER_FEMALE = 'FEMALE';

    Booking.prototype.toRemoteObject = function (context) {
        return {
            id              : this.id,
            business        : Promise.ninvoke(this.business).then(function (business) {
                return business ? business.toRemoteShortObject(context) : null;
            }),
            firstName       : this.firstName,
            lastName        : this.lastName,
            gender          : this.gender,
            email           : this.email,
            phoneNumber     : this.phoneNumber,
            comment         : this.comment,
            timeslot        : this.timeslot,
            discount        : this.discount,
            createdAt       : this.createdAt,
            updatedAt       : this.updatedAt
        };
    };

    Booking.afterCreate = function (next) {
        var Email = Booking.app.models.email;
        var booking = this;

        Promise.npost(this, 'business')
            .then(function (business) {
                Email.confirmBooking(booking, business);

                return Booking.app.models.email.notifySales('Demande de réservation', {
                    'ID'              : booking.id,
                    'Salon'           : business.name,
                    'Tel du salon'    : business.phoneNumber,
                    'Date & Heure de la demande' : moment(booking.timeslot).format("D/MM/YYYY [à] HH:mm"),
                    'Client'          : booking.firstName + ' ' + booking.lastName,
                    'Genre'           : booking.gender,
                    'Email du client' : booking.email,
                    'Tel du client'   : booking.phoneNumber,
                    'Prestation'      : booking.comment
                });
            })
            .fail(console.log);

        next();
    };
};
