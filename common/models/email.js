'use strict';

var Q = require('q');
var loopback = require('loopback');
var path = require('path');

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
            text: loopback.template(relativePath(options.template, 'txt'))(options.templateVars),
            html: loopback.template(relativePath(options.template, 'html'))(options.templateVars)
        });

        var deferred = Q.defer();

        email.send(deferred.makeNodeResolver());

        return deferred.promise;
    }

    function relativePath(template, format) {
        return path.resolve(__dirname, '../../server/views/email/' + template + '.' + format + '.ejs');
    }
}
