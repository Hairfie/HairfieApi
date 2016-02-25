'use strict';

var Promise = require('../../common/utils/Promise');
var moment = require('moment-timezone');
var Hooks = require('./hooks');
var phone = require('phone');
var semver = require('semver');
var Control = require('../utils/AccessControl');

module.exports = function (Booking) {
    Hooks.generateId(Booking);
    Hooks.updateTimestamps(Booking);

    Booking.STATUS_NOT_CONFIRMED    = 'NOT_CONFIRMED';
    Booking.STATUS_REQUEST          = 'REQUEST';
    Booking.STATUS_IN_PROCESS       = 'IN_PROCESS';
    Booking.STATUS_CONFIRMED        = 'CONFIRMED';
    Booking.STATUS_CANCELLED        = 'CANCELLED';      // Cancelled by user
    Booking.STATUS_CANCEL_REQUEST   = 'CANCEL_REQUEST';      // Cancelled by user
    Booking.STATUS_HONORED          = 'HONORED';
    Booking.STATUS_NOSHOW           = 'NOSHOW';


    Booking.observe('before save', function (ctx, next) {
        if (ctx.instance && ctx.instance.timeslot && !ctx.instance.dateTime) ctx.instance.dateTime = ctx.instance.timeslot;

        if (ctx.instance && ctx.instance.status == Booking.STATUS_NOT_CONFIRMED) {
            if (!ctx.instance.userCheckCode) ctx.instance.userCheckCode = Math.floor(Math.random()*9000) + 1000;
            var phonenumber = phone(ctx.instance.phoneNumber, 'FR')[0];
            if(!phonenumber) {
                phonenumber = phone(ctx.instance.phoneNumber)[0];
            }
            ctx.instance.phoneNumber = phonenumber;
        }
        next();
    });

    Booking.observe('after save', function (ctx, next) {
        if (ctx.instance && ctx.instance.userCheckCode && !ctx.instance.userCheck && ctx.instance.status == Booking.STATUS_NOT_CONFIRMED && !ctx.instance.hidden) {
            var TextMessage     = Booking.app.models.TextMessage;
            TextMessage.send(ctx.instance.phoneNumber, "Utilisez " + ctx.instance.userCheckCode + " pour valider votre reservation sur Hairfie. Une question ? Envoyez nous un email a l'adresse hello@hairfie.com ou au +33185089169");
        }
        next();
    });

    Booking.prototype.toRemoteObject =
    Booking.prototype.toShortRemoteObject = function (context) {
        var dateTime = this.dateTime || this.timeslot;

        return {
            id                  : this.id,
            href                : Booking.app.urlGenerator.api('bookings/'+this.id),
            business            : Promise.ninvoke(this.business).then(function (business) {
                return business ? business.toRemoteShortObject(context) : null;
            }),
            confirmed           : this.confirmed,
            firstName           : this.firstName,
            lastName            : this.lastName,
            gender              : this.gender,
            email               : this.email,
            phoneNumber         : this.phoneNumber,
            hairLength          : this.hairLength || "",
            service             : this.service || "",
            comment             : this.comment,
            adminNote           : this.adminNote,
            dateTime            : dateTime,
            displayDateTime     : moment(dateTime).tz('Europe/Paris').format("D/MM/YYYY [à] HH:mm"),
            timeslot            : dateTime,
            displayTimeslot     : moment(dateTime).tz('Europe/Paris').format("D/MM/YYYY [à] HH:mm"),
            discount            : this.discount,
            status              : this.status ? this.status : Booking.STATUS_WAITING,
            userCheck           : this.userCheck,
            userCheckCode       : this.userCheckCode,
            confirmationSentAt  : this.confirmationSentAt,
            newsletter          : this.newsletter,
            firstTimeCustomer   : this.firstTimeCustomer,
            cancellation        : this.cancellation ? this.cancellation : {},
            createdAt           : this.createdAt,
            updatedAt           : this.updatedAt
        };
    };

    Booking.userCheck = function(bookingId, userCheckCode, cb) {
        if (!userCheckCode) return cb({statusCode: 401});

        var Email = Booking.app.models.email;

        return Promise.ninvoke(Booking, 'findById', bookingId)
            .then(function (booking) {
                if (!booking) return cb({statusCode: 404});

                if(booking.userCheckCode != userCheckCode) return cb({statusCode: 401})

                booking.userCheck = true;
                booking.status = Booking.STATUS_REQUEST;

                booking.business(function (err, business) {
                    Email.confirmBookingRequest(booking, business);
                });

                return Promise.npost(booking, 'save');
            });
    };

    Booking.confirm = function(req, user, cb) {
        if(semver.satisfies(req.apiVersion, '<1.1')){
            console.log("Api v1 : no security on confirmation");
        } else {
            if (!user) return cb({statusCode: 401, message: 'You must be logged in to confirm a booking'});
        }

        return Promise.ninvoke(Booking, 'findById', req.params.bookingId)
            .then(function (booking) {
                if (!booking) return cb({statusCode: 404});
                var businessId = booking.businessId;
                var isManager = user.admin ? true : user.isManagerOfBusiness(businessId);

                return [
                    isManager,
                    booking
                ];
            })
            .spread(function(isManager, booking) {
                if (!isManager) return cb({statusCode: 403, message: 'You must be a manager of this business to confirm a booking'});
                booking.confirmed = true;
                booking.status = Booking.STATUS_CONFIRMED;

                return Promise.npost(booking, 'save');
            })
            .then(function (booking) {
                if(!booking.confirmationSentAt) {
                    // notify client of the booking confirmation
                    var Email = Booking.app.models.email;

                    booking.business(function (err, business) {
                        Email.notifyBookingConfirmed(booking, business);
                        booking.confirmationSentAt = new Date();
                        booking.save();
                    });
                }
                return booking;
            });
    };

    Booking.cancel = function(req, cb) {
        return Promise.ninvoke(Booking, 'findById', req.params.bookingId)
                .then(function (booking) {
                    if (!booking) return cb({statusCode: 404});

                    booking.status = Booking.STATUS_CANCEL_REQUEST;

                    return Promise.npost(booking, 'save');
                })
            .then(function(booking) {
                return [Promise.npost(booking, 'business'), booking];
            })
            .spread(function(business, booking) {
                Booking.app.models.email.notifySales("Demande d'annulation", {
                    'ID'              : booking.id,
                    'Salon'           : business.name,
                    'Tel du salon'    : business.phoneNumber,
                    'Date & Heure de la demande' : moment(booking.dateTime).tz('Europe/Paris').format("D/MM/YYYY [à] HH:mm"),
                    'Client'          : booking.firstName + ' ' + booking.lastName,
                    'Genre'           : booking.gender,
                    'Email du client' : booking.email,
                    'Tel du client'   : booking.phoneNumber,
                    'Prestation'      : booking.comment,
                    'Promo'           : booking.discount
                });
                return booking;
            })
    };

    Booking.adminCancel = function(req, user, cb) {
        return Promise.ninvoke(Booking, 'findById', req.params.bookingId)
                .then(function (booking) {
                    if (!booking) return cb({statusCode: 404});

                    var isAllowed = user.admin;
                    if (!isAllowed) return cb({statusCode: 403});

                    booking.cancelled = true;
                    booking.status = Booking.STATUS_CANCELLED;
                    if(req.body.cancellation) {
                        booking.cancellation = req.body.cancellation;
                    }
                    return Promise.npost(booking, 'save');
                })
            .then(function(booking) {
                return [Promise.npost(booking, 'business'), booking];
            })
            .spread(function(business, booking) {
                Booking.app.models.email.notifySales('Réservation annulée', {
                    'ID'              : booking.id,
                    'Salon'           : business.name,
                    'Tel du salon'    : business.phoneNumber,
                    'Date & Heure de la demande' : moment(booking.dateTime).tz('Europe/Paris').format("D/MM/YYYY [à] HH:mm"),
                    'Client'          : booking.firstName + ' ' + booking.lastName,
                    'Genre'           : booking.gender,
                    'Email du client' : booking.email,
                    'Tel du client'   : booking.phoneNumber,
                    'Prestation'      : booking.comment,
                    'Promo'           : booking.discount
                });
                return booking;
            })
    };

    Booking.delete = function (req, user, cb) {
        if (!user) return cb({statusCode: 401});

        return Promise.ninvoke(Booking, 'findById', req.params.bookingId)
            .then(function (booking) {
                if (!booking) return cb({statusCode: 404});

                var isAllowed = user.admin;

                if (!isAllowed) return cb({statusCode: 403});

                booking.hidden = true;

                return Promise.npost(booking, 'save');
            })
    };

    Booking.honored = function(req, user, cb) {
        if (!user) return cb({statusCode: 401, message: 'You must be logged in to honor a booking'});

        return Promise.ninvoke(Booking, 'findById', req.params.bookingId)
            .then(function (booking) {
                if (!booking) return cb({statusCode: 404});
                var businessId = booking.businessId;
                var isManager = user.admin ? true : user.isManagerOfBusiness(businessId);

                return [
                    isManager,
                    booking
                ];
            })
            .spread(function(isManager, booking) {
                if (!isManager) return cb({statusCode: 403, message: 'You must be a manager of this business to confirm a booking'});

                booking.status = Booking.STATUS_HONORED;

                return Promise.all([
                    Promise.ninvoke(Booking.app.models.BusinessReviewRequest, 'create', {
                        businessId  : booking.businessId,
                        bookingId   : booking.id,
                        email       : booking.email
                    }),
                    Promise.npost(booking, 'save')
                ]);
            }).spread(function (businessReviewRequest, booking) {
                return booking;
            });
    };

    Booking.processing = function(req, user, cb) {
        if (!user) return cb({statusCode: 401, message: 'You must be logged in to process a booking'});

        return Promise.ninvoke(Booking, 'findById', req.params.bookingId)
            .then(function (booking) {
                if (!booking) return cb({statusCode: 404});
                var businessId = booking.businessId;
                var isManager = user.admin ? true : user.isManagerOfBusiness(businessId);

                return [
                    isManager,
                    booking
                ];
            })
            .spread(function(isManager, booking) {
                if (!isManager) return cb({statusCode: 403, message: 'You must be a manager of this business to process a booking'});
                booking.status = Booking.STATUS_IN_PROCESS;

                return Promise.npost(booking, 'save');
            })
            .then(function (booking) {

                return booking;
            });
    };

    Booking.beforeRemote('*.updateAttributes', Control.isAuthenticated(function (ctx, unused, next) {
        if(ctx.req.user.isManagerOfBusiness(req.params.bookingId)) {
            next();
        } else {
            next({statusCode: 403})
        }
    }));

    Booking.afterCreate = function (next) {
        //var Email = Booking.app.models.email;
        var booking = this;

        Promise.npost(this, 'business')
            .then(function (business) {
                var url = Booking.app.urlGenerator.business(business);
                var bookingUrl = Booking.app.urlGenerator.adminBooking(booking);

                return Booking.app.models.email.notifySales('Demande de réservation', {
                    'Booking ID'      : booking.id,
                    'Admin URL'       : bookingUrl,
                    'Salon'           : business.name,
                    'Ville'           : business.address.zipCode + ' - ' + business.address.city,
                    'Tel du salon'    : business.phoneNumber,
                    'URL du salon'    : url,
                    'Date & Heure de la demande' : moment(booking.dateTime).tz('Europe/Paris').format("D/MM/YYYY [à] HH:mm"),
                    'Client'          : booking.firstName + ' ' + booking.lastName,
                    'Genre'           : booking.gender,
                    'Email du client' : booking.email,
                    'Nouveau Client ?': booking.firstTimeCustomer,
                    'Tel du client'   : booking.phoneNumber,
                    'Longueur'        : booking.hairLength || "",
                    'Service'         : booking.service || "",
                    'Promo'           : booking.discount + ' %'
                });
            })
            .fail(console.log);

        next();
    };

    Booking.prototype.toMailchimp = function () {
        var registered = this.userId ? "YES" : "NO";
        var newsletter = this.newsletter ? "YES" : "NO";
        var lastBooking = moment(this.dateTime).format("DD/MM/YYYY");

        return {
            email: {email: this.email},
            merge_vars: {
                fname: this.firstName,
                lname: this.lastName,
                gender: this.gender,
                booking: lastBooking,
                registered: registered,
                newsletter: newsletter
            }
        }
    }

    Booking.remoteMethod('userCheck', {
        description: 'Verify the number',
        accepts: [
            {arg: 'bookingId', type: 'string', required: true, description: 'ID of the booking'},
            {arg: 'userCheckCode', type: 'string', required: true, description: 'User Check Code'},
        ],
        returns: {arg: 'result', root: true},
        http: { path: '/:bookingId/userCheck', verb: 'POST' }
    });

    Booking.remoteMethod('confirm', {
        description: 'Confirm the booking',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}},
            {arg: 'user', type: 'object', http: function (ctx) { return ctx.req.user; }}
        ],
        returns: {arg: 'result', root: true},
        http: { path: '/:bookingId/confirm', verb: 'POST' }
    });

    Booking.remoteMethod('honored', {
        description: 'The booking is honored',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}},
            {arg: 'user', type: 'object', http: function (ctx) { return ctx.req.user; }}
        ],
        returns: {arg: 'result', root: true},
        http: { path: '/:bookingId/honored', verb: 'POST' }
    });

    Booking.remoteMethod('processing', {
        description: 'The booking is processed',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}},
            {arg: 'user', type: 'object', http: function (ctx) { return ctx.req.user; }}
        ],
        returns: {arg: 'result', root: true},
        http: { path: '/:bookingId/processing', verb: 'POST' }
    });

    Booking.remoteMethod('cancel', {
        description: 'Cancel Request the booking',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}}
        ],
        returns: {arg: 'result', root: true},
        http: { path: '/:bookingId/cancel', verb: 'POST' }
    });

    Booking.remoteMethod('adminCancel', {
        description: 'Cancel the booking',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}},
            {arg: 'user', type: 'object', http: function (ctx) { return ctx.req.user; }}
        ],
        returns: {arg: 'result', root: true},
        http: { path: '/:bookingId/adminCancel', verb: 'POST' }
    });

    Booking.remoteMethod('delete', {
        description: 'Delete the booking',
        accepts: [
            {arg: 'req', type: 'object', 'http': {source: 'req'}},
            {arg: 'user', type: 'object', http: function (ctx) { return ctx.req.user; }}
        ],
        returns: {arg: 'result', root: true},
        http: { path: '/:bookingId', verb: 'DELETE' }
    });
};
