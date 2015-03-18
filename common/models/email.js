'use strict';

var Q = require('q');
var loopback = require('loopback');
var path = require('path');
var ejs = require('ejs');
var juice = require('juice');
var fs = require('fs');
var debug = require('debug')('Model:Email');
var htmlToText = require('html-to-text');
var moment = require('moment');

module.exports = function (Email) {
    var languages = ['en', 'fr'];

    Email.notifySales = function (channel, data, links) {
        var links = links || {};

        var env = Email.app.get('env');
        var envLabel = (env.toLowerCase() !== 'production') ? '[' + env + ']' : '';

        var recipient = Email.app.get("salesEventEmail");

        if (!recipient) {
            debug('Notify sales: no email configured, skipping');
            return Q(null);
        }

        return send({
            to: recipient,
            language: 'en',
            template: 'notifySales',
            templateVars: {
                env     : envLabel,
                channel : channel,
                data    : data,
                links   : links
            }
        });
    };

    Email.welcomeUser = function (user) {
        return send({
            to: user.getFullEmail(),
            language: user.language,
            template: 'welcomeUser',
            templateVars: {user: user}
        });
    }

    Email.resetUserPassword = function (user, resetUrl) {
        return send({
            to: user.getFullEmail(),
            language: user.language,
            template: 'resetUserPassword',
            templateVars: {user: user, resetUrl: resetUrl}
        });
    }

    Email.sendHairfie = function (hairfie, author, business, businessMember) {
        var url = Email.app.urlGenerator;

        return send({
            to: hairfie.customerEmail,
            language: author.language,
            template: 'sendHairfie',
            templateVars: {
                hairfie         : hairfie,
                author          : author,
                business        : business,
                businessMember  : businessMember,
                hairfieUrl      : url.hairfie(hairfie),
                iosAppUrl       : Email.app.get('iosAppUrl')
            }
        });
    };

    Email.requestBusinessReview = function (business, reviewRequest) {
        var url = Email.app.urlGenerator;

        return send({
            to: reviewRequest.email,
            template: 'requestBusinessReview',
            templateVars: {
                business        : business,
                writeReviewUrl  : url.businessReviewRequest(reviewRequest),
            }
        });
    };

    Email.welcomeBusinessMember = function (business, user) {
        return send({
            to: user.email,
            language: user.language,
            template: 'welcomeBusinessMember',
            templateVars: {
                user    : user,
                business: business
            }
        });
    };

    Email.confirmBooking = function (booking, business) {
        var language = booking.language || 'fr';
        var timeslot = moment(booking.timeslot).format("D/MM/YYYY [à] HH:mm");

        return send({
            to: booking.email,
            language: language,
            template: 'confirmBooking',
            templateVars: {
                booking    : booking,
                business   : business,
                timeslot   : timeslot
            }
        });
    };

    function send(options) {
        debug('Sending email', options)
        var app = Email.app;

        var layout   = options.layout;
        var language = options.language || languages[0];

        if (!layout && false !== layout) layout = 'layout';

        if (-1 === languages.indexOf(language)) {
            language = languages[0];
        }

        var htmlBody = getHtmlBody(options.template, options.templateVars, language, layout),
            textBody = htmlToText.fromString(htmlBody);

        var email = new Email({
            subject : getSubject(options.template, options.templateVars, language),
            from    : options.from || app.get('emailFrom'),
            to      : options.to,
            bcc     : options.bcc || app.get('emailBcc'),
            html    : htmlBody,
            text    : textBody
        });

        var deferred = Q.defer();

        email.send(function (error) {
            if (error) {
                debug('Failed to send email', error);
                deferred.reject(error);
            } else {
                debug('Email successfully sent');
                deferred.resolve();
            }
        });

        return deferred.promise;
    }

    function getSubject(template, templateVars, language) {
        var config = require(path.resolve(__dirname, '../../server/emails/'+template+'.json'));

        return ejs.compile(config.subject[language])(templateVars);
    }

    function getHtmlBody(template, templateVars, language, layout) {
        var css  = readCssFile('email'),
            html = renderHtmlBody(template, templateVars, language, layout);


        return juice.inlineContent(html, css);
    }

    function renderHtmlBody(template, templateVars, language, layout) {
        var html = loopback.template(templatePath(template, language, 'html'))(templateVars);

        // decorate with layout
        if (layout) {
            html = loopback.template(templatePath(layout, language, 'html'))({
                logoSrc     : Email.app.urlGenerator.mailImage('logo@2x.png'),
                appStoreSrc : Email.app.urlGenerator.mailImage('app-store.png'),
                appStoreUrl : Email.app.get('iosAppUrl'),
                content     : html
            });
        }

        return html;
    }

    function getTextBody(template, templateVars, language) {
        return loopback.template(templatePath(template, language, 'txt'))(templateVars);
    }

    function readCssFile(name) {
        var path = relativePath('stylesheets/'+name+'.css');

        return fs.readFileSync(path, 'utf8')
    }

    function templatePath(template, language, format) {
        return relativePath(template + '.' + language + '.' + format + '.ejs');
    }

    function relativePath(filename) {
        return path.resolve(__dirname, '../../server/emails/'+filename);
    }
}
