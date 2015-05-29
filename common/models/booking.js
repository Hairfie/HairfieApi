'use strict';

var Promise = require('../../common/utils/Promise');
var moment = require('moment-timezone');
var Hooks = require('./hooks');

module.exports = function (Booking) {
    Hooks.generateId(Booking);
    Hooks.updateTimestamps(Booking);

    Booking.STATUS_WAITING          = 'WAITING';
    Booking.STATUS_CONFIRMED        = 'CONFIRMED';
    Booking.STATUS_NOT_AVAILABLE    = 'NOT_AVAILABLE';  // Business not available
    Booking.STATUS_CANCELLED        = 'CANCELLED';      // Cancelled by user
    Booking.STATUS_DONE             = 'DONE';
    Booking.STATUS_NOSHOW           = 'NOSHOW';


    Booking.observe('before save', function (ctx, next) {
        if (ctx.instance && ctx.instance.timeslot && !ctx.instance.dateTime) ctx.instance.dateTime = ctx.instance.timeslot;
        next();
    });

    Booking.prototype.toRemoteObject =
    Booking.prototype.toShortRemoteObject = function (context) {
        var dateTime = this.dateTime || this.timeslot;

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
            dateTime        : dateTime,
            displayDateTime : moment(dateTime).tz('Europe/Paris').format("D/MM/YYYY [à] HH:mm"),
            timeslot        : dateTime,
            displayTimeslot : moment(dateTime).tz('Europe/Paris').format("D/MM/YYYY [à] HH:mm"),
            discount        : this.discount,
            status          : this.status ? this.status : Booking.STATUS_WAITING,
            createdAt       : this.createdAt,
            updatedAt       : this.updatedAt
        };
    };

    Booking.confirm = function(req, businessId, user, cb) {
        if (!user) return cb({statusCode: 401});

        return user.isManagerOfBusiness(businessId)
            .then(function (isManager) {
                if (!isManager) return cb({statusCode: 403});

                return Promise.ninvoke(Booking, 'findById', req.params.bookingId)
            })
            .then(function (booking) {
                if (!booking) return cb({statusCode: 404});
                if (booking.confirmed) return cb({statusCode: 401});

                booking.confirmed = true;
                booking.status = Booking.STATUS_CONFIRMED;

                return Promise.npost(booking, 'save');
            });
    };

    Booking.cancel = function(req) {
        return Promise.ninvoke(Booking, 'findById', req.params.bookingId)
            .then(function (booking) {
                if (!booking) return next({statusCode: 404});

                booking.cancelled = true;
                booking.status = Booking.STATUS_CANCELLED;

                return Promise.npost(booking, 'save');
            });
    };

    Booking.done = function(req) {
        return Promise.ninvoke(Booking, 'findById', req.params.bookingId)
            .then(function (booking) {
                if (!booking) return next({statusCode: 404});

                booking.status = Booking.STATUS_DONE;

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
                Email.confirmBookingRequest(booking, business);

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
            {arg: 'req', type: 'object', 'http': {source: 'req'}},
            {arg: 'businessId', type: 'string', description: 'ID of the reference business'},
            {arg: 'user', type: 'object', http: function (ctx) { return ctx.req.user; }}
        ],
        returns: {arg: 'result', root: true},
        http: { path: '/:bookingId/confirm', verb: 'POST' }
    });
};
