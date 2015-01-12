'use strict';

var Q = require('q');
var loopback = require('loopback');
var path = require('path');
var ejs = require('ejs');
var juice = require('juice');
var fs = require('fs');
var debug = require('debug')('Model:Email');
var htmlToText = require('html-to-text');

module.exports = function (Email) {
    var from      = 'Hairfie <hello@hairfie.com>',
        languages = ['en', 'fr'];

    Email.notifySales = function (channel, data) {
        return send({
            to: Email.app.get("salesEventEmail"),
            language: 'en',
            template: 'notifySales',
            templateVars: {channel: channel, data: data}
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

    Email.sendHairfie = function (hairfie, pictureObject, author) {
        return send({
            to: hairfie.customerEmail,
            language: author.language,
            template: 'sendHairfie',
            templateVars: {hairfie: hairfie, hairfieUrl: pictureObject.url, author: author}
        });
    };

    Email.requestReview = function (businessReviewRequest, business, author) {
        return send({
            to: businessReviewRequest.email,
            language: author.language,
            template: 'requestReview',
            templateVars: {
                business      : business,
                writeReviewUrl: Email.app.urlGenerator.writeVerifiedBusinessReview(businessReviewRequest)
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

    function send(options) {
        debug('Sending email', options)

        var layout   = options.layout;
        var language = options.language || languages[0];

        if (!layout && false !== layout) layout = 'layout';

        if (-1 === languages.indexOf(language)) {
            language = languages[0];
        }

        var email = new Email({
            subject : getSubject(options.template, options.templateVars, language),
            from    : options.from || from,
            to      : options.to,
            html    : getHtmlBody(options.template, options.templateVars, language, layout),
            text    : htmlToText.fromString(htmlBody)
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
        if (layout) html = loopback.template(templatePath(layout, language, 'html'))({content: html});

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
