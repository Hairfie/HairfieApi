'use strict';

var Q = require('q');

module.exports = function (Email) {

    Email.welcomeUser = function (user) {
        var email = new Email({
            from: 'Hairfie <no-reply@hairfie.com>',
            to: user.getFullEmail(),
            subject: 'Hello %firstName%, welcome to Hairfie!',
            headers: {
                "X-SMTPAPI": JSON.stringify({
                    category: ["User registrations"],
                    unique_args: {
                        userId: user.id
                    },
                    sub: {
                        "%firstName%": [user.firstName],
                        "%lastName%": [user.lastName],
                        "%fullName%": [user.getFullName()]
                    },
                    filters: {
                        templates: {
                            settings: {
                                enable: 1,
                                template_id: "3261f067-cb5c-4c33-b22f-6cffbff40e5e"
                            }
                        }
                    }
                })
            }
        });

        var deferred = Q.defer();

        email.send(deferred.makeNodeResolver());

        return deferred.promise;
    }
}
