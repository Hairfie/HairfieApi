'use strict';

var Promise = require('../../common/utils/Promise');

module.exports = function (Booking) {
    Booking.GENDER_MALE = 'MALE';
    Booking.GENDER_FEMALE = 'FEMALE';


    Booking.afterCreate = function (next) {
        var Email = Booking.app.models.email;
        var booking = this;

        Promise.npost(this, 'business')
            .then(function (business) {
                console.log("here business", business);
                return Business.app.models.email.notifySales('Demande de réservation', {
                    'ID'       : booking.id,
                    'Salon'    : business.name,
                    'Tel du salon'    : business.phoneNumber,
                    'Client'   : booking.firstName && booking.lastName
                });
            })
            .then(next.bind(null, null), next);
    };
};
