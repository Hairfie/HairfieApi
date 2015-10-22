'use strict';

var Q = require('q');
var loopback = require('loopback');
var path = require('path');
var ejs = require('ejs');
var juice = require('juice');
var fs = require('fs');
var debug = require('debug')('Model:Email');
var htmlToText = require('html-to-text');
var moment = require('moment-timezone');

module.exports = function (Email) {
    var locales = ['en', 'fr'];

    Email.notifySales = function (channel, data, links) {
        var links = links || {};

        var env = Email.app.get('env');
        var envLabel = Email.app.get("emailPrefix");

        var recipient = Email.app.get("salesEventEmail");

        if (!recipient) {
            debug('Notify sales: no email configured, skipping');
            return Q(null);
        }

        return send({
            to: recipient,
            locale: 'en',
            template: 'notifySales',
            templateVars: {
                env     : envLabel,
                channel : channel,
                data    : data,
                links   : links
            }
        });
    };

    Email.notifyAll = function (channel, data, links) {
        var links = links || {};

        var env = Email.app.get('env');
        var envLabel = Email.app.get("emailPrefix");

        var recipient = Email.app.get("eventStreamEmail");

        if (!recipient) {
            debug('Notify all: no eventStreamEmail configured, skipping');
            return Q(null);
        }

        return send({
            to: recipient,
            locale: 'en',
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
            locale: user.locale,
            template: 'welcomeUser',
            templateVars: {user: user}
        });
    }

    Email.resetUserPassword = function (user, resetUrl) {
        return send({
            to: user.getFullEmail(),
            locale: user.locale,
            template: 'resetUserPassword',
            templateVars: {user: user, resetUrl: resetUrl}
        });
    }

    Email.sendHairfie = function (hairfie, author, business, businessMember) {
        var url = Email.app.urlGenerator;

        return send({
            to: hairfie.customerEmail,
            locale: author.locale,
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
            locale: user.locale,
            template: 'welcomeBusinessMember',
            templateVars: {
                user    : user,
                business: business
            }
        });
    };

    Email.confirmBookingRequest = function (booking, business) {
        var locale = booking.locale || 'fr';
        var dateTime = moment(booking.dateTime).tz('Europe/Paris').format("D/MM/YYYY [à] HH:mm");

        return send({
            to: booking.email,
            locale: locale,
            template: 'confirmBookingRequest',
            templateVars: {
                booking    : booking,
                business   : business,
                dateTime   : dateTime
            }
        });
    };

    Email.notifyBookingConfirmed = function (booking, business) {
        var locale = 'fr'; //booking.locale || 'fr';
        var dateTime = moment(booking.dateTime).tz('Europe/Paris').format("D/MM/YYYY [à] HH:mm");

        return send({
            to: booking.email,
            locale: locale,
            template: 'notifyBookingConfirmed',
            templateVars: {
                booking: booking,
                business: business,
                businessUrl: Email.app.urlGenerator.business(business),
                address: business.address || {},
                dateTime: dateTime
            }
        });
    };

    function send(options) {
        debug('Sending email', options)
        var app = Email.app;

        var layout = options.layout;
        var locale = bestLocale(locales, options.locale);

        if (!layout && false !== layout) layout = 'layout';

        var htmlBody = getHtmlBody(options.template, options.templateVars, locale, layout),
            textBody = htmlToText.fromString(htmlBody);

        var email = new Email({
            subject : getSubject(options.template, options.templateVars, locale),
            from    : options.from || app.get('emailFrom'),
            to      : options.to,
            bcc     : options.bcc || app.get('emailBcc'),
            html    : htmlBody,
            text    : textBody
        });

        var deferred = Q.defer();

        email.send(function (error) {
            if (error) {
                console.log('Failed to send email', error);
                deferred.reject(error);
            } else {
                console.log('Email successfully sent');
                deferred.resolve();
            }
        });

        return deferred.promise;
    }

    function getSubject(template, templateVars, locale) {
        var config = require(path.resolve(__dirname, '../../server/emails/'+template+'.json'));

        return ejs.compile(config.subject[locale])(templateVars);
    }

    function getHtmlBody(template, templateVars, locale, layout) {
        var css  = readCssFile('email'),
            html = renderHtmlBody(template, templateVars, locale, layout);


        return juice.inlineContent(html, css);
    }

    function renderHtmlBody(template, templateVars, locale, layout) {
        var html = loopback.template(templatePath(template, locale, 'html'))(templateVars);

        // decorate with layout
        if (layout) {
            html = loopback.template(templatePath(layout, locale, 'html'))({
                logoSrc     : Email.app.urlGenerator.mailImage('logo@2x.png'),
                appStoreSrc : Email.app.urlGenerator.mailImage('app-store.png'),
                appStoreUrl : Email.app.get('iosAppUrl'),
                content     : html
            });
        }

        return html;
    }

    function getTextBody(template, templateVars, locale) {
        return loopback.template(templatePath(template, locale, 'txt'))(templateVars);
    }

    function readCssFile(name) {
        var path = relativePath('stylesheets/'+name+'.css');

        return fs.readFileSync(path, 'utf8')
    }

    function templatePath(template, locale, format) {
        return relativePath(template + '.' + locale + '.' + format + '.ejs');
    }

    function relativePath(filename) {
        return path.resolve(__dirname, '../../server/emails/'+filename);
    }
}

function bestLocale(supported, preferred) {
    var preferred = (preferred || '').substr(0, 2);

    return -1 === supported.indexOf(preferred) ? supported[0] : preferred;
}
