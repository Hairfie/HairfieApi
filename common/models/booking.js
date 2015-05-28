'use strict';

var Promise = require('../../common/utils/Promise');
var moment = require('moment-timezone');
var Hooks = require('./hooks');

module.exports = function (Booking) {
    Hooks.generateId(Booking);
    Hooks.updateTimestamps(Booking);

    Booking.GENDER_MALE = 'MALE';
    Booking.GENDER_FEMALE = 'FEMALE';

    Booking.prototype.toRemoteObject =
    Booking.prototype.toShortRemoteObject = function (context) {
        return {
            id              : this.id,
            href            : Booking.app.urlGenerator.api('bookings/'+this.id),
            business        : Promise.ninvoke(this.business).then(function (business) {
                return business ? business.toRemoteShortObject(context) : null;
            }),
            confirmed       : this.confirmed,
            firstName       : this.firstName,
            lastName        : this.lastName,
            gender          : this.gender,
            email           : this.email,
            phoneNumber     : this.phoneNumber,
            comment         : this.comment,
            timeslot        : this.timeslot,
            displayTimeslot : moment(this.timeslot).tz('Europe/Paris').format("D/MM/YYYY [à] HH:mm"),
            discount        : this.discount,
            createdAt       : this.createdAt,
            updatedAt       : this.updatedAt
        };
    };

    Booking.confirm = function(req) {
        return Promise.ninvoke(Booking, 'findById', req.params.bookingId)
            .then(function (booking) {
                if (!booking) return next({statusCode: 404});
                if (booking.confirmed) return next({statusCode: 401});

                booking.confirmed = true;

                return Promise.npost(booking, 'save');

                // NOTE: confirmed means the hairdresser has accepted the booking
                //       we need another step to acknowledge the actual cut
                return Promise.all([
                    Promise.ninvoke(Booking.app.models.BusinessReviewRequest, 'create', {
                        businessId  : booking.businessId,
                        bookingId   : booking.id,
                        email       : booking.email
                    }),
                    Promise.npost(booking, 'save')
                ]);
            });
    };

    Booking.afterCreate = function (next) {
        var Email = Booking.app.models.email;
        var booking = this;

        Promise.npost(this, 'business')
            .then(function (business) {
                Email.confirmBooking(booking, business);

                return Booking.app.models.email.notifyAll('Demande de réservation', {
                    'ID'              : booking.id,
                    'Salon'           : business.name,
                    'Tel du salon'    : business.phoneNumber,
                    'Date & Heure de la demande' : moment(booking.timeslot).tz('Europe/Paris').format("D/MM/YYYY [à] HH:mm"),
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

    Booking.remoteMethod('confirm', {
        description: 'Confirm the booking',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}}
        ],
        returns: {arg: 'result', root: true},
        http: { path: '/:bookingId/confirm', verb: 'POST' }
    });
};
