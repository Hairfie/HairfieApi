'use strict';

var Q = require('q');
var loopback = require('loopback');
var path = require('path');
var ejs = require('ejs');
var juice = require('juice');
var fs = require('fs');
var debug = require('debug')('Model:Email');

module.exports = function (Email) {
    var from      = 'Hairfie <hello@hairfie.com>',
        languages = ['en', 'fr'];

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
            language: hairfie.author.language,
            template: 'sendHairfie',
            templateVars: {hairfie: hairfie, hairfieUrl: pictureObject.url, author: author}
        });
    }

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

        var language = options.language || languages[0];

        if (-1 === languages.indexOf(language)) {
            language = languages[0];
        }

        var email = new Email({
            subject : getSubject(options.template, options.templateVars, language),
            from    : options.from || from,
            to      : options.to,
            html    : getHtmlStyledBody(options.template, options.templateVars, language),
            text    : getTextBody(options.template, options.templateVars, language)
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

    function getHtmlBody(template, templateVars, language) {
        return loopback.template(relativePath(template, language, 'html'))(templateVars);
    }

    function getHtmlStyledBody(template, templateVars, language) {
        var deferred = Q.defer();
        var cssFile = path.resolve(__dirname, '../../server/emails/stylesheets/email.css');
        var css = fs.readFileSync(cssFile, 'utf8');
        var html = getHtmlBody(template, templateVars, language);
        return juice.inlineContent(html, css);
    }

    function getTextBody(template, templateVars, language) {
        return loopback.template(relativePath(template, language, 'txt'))(templateVars);
    }

    function relativePath(template, language, format) {
        return path.resolve(__dirname, '../../server/emails/' + template + '.' + language + '.' + format + '.ejs');
    }
}
