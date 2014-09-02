'use strict';

var Q = require('q');
var loopback = require('loopback');

module.exports = function (Email) {

    var from = 'Hairfie <no-reply@hairfie.com>';

    Email.welcomeUser = function (user) {
        return send({
            to: user.getFullEmail(),
            subject: 'Hello '+user.firstName+', welcome to Hairfie!',
            template: 'welcomeUser',
            templateVars: {user: user},
        });
    }

    Email.resetUserPassword = function (user, resetUrl) {
        return send({
            to: user.getFullEmail(),
            subject: 'Did you forget your password?',
            template: 'resetUserPassword',
            templateVars: {user: user, resetUrl: resetUrl}
        });
    }

    function send(options) {
        var email = new Email({
            subject: options.subject,
            from: options.from || from,
            to: options.to,
            text: loopback.template('server/views/email/'+options.template+'.txt.ejs')(options.templateVars),
            html: loopback.template('server/views/email/'+options.template+'.html.ejs')(options.templateVars)
        });

        var deferred = Q.defer();

        email.send(deferred.makeNodeResolver());

        return deferred.promise;
    }
}
