'use strict';

var Promise = require('../../common/utils/Promise');
var moment = require('moment-timezone');
var Hooks = require('./hooks');
var phone = require('phone');
var semver = require('semver');
var Control = require('../utils/AccessControl');
var Q = require('Q');

module.exports = function (Subscriber) {
    Hooks.generateId(Subscriber);
    Hooks.updateTimestamps(Subscriber);

    Subscriber.prototype.toRemoteObject =
    Subscriber.prototype.toShortRemoteObject = function (context) {

        return {
            id                   : this.id,
            email                : this.email
        };
    };

    Subscriber.observe('after save', function (ctx, next) {
        var Email = Subscriber.app.models.Email;

        var getInstance = Q(null);
        if (ctx.instance) getInstance = Q(ctx.instance);
        else {
            var id = tryGetId(ctx.where);
            if (id) getInstance = Q.ninvoke(Email, 'findById', id);
        }

        getInstance
            .then(function (subscriber) {
                if (!subscriber) return null;
                Email.notifyAll('Nouvel Email newsletter', {
                    'ID'              : subscriber.id,
                    'Email'           : subscriber.email
                });
            })
            .fail(function (error) {
                console.log('Failed to update search document:', error, error.stack);
            });

        next();
    });

    Subscriber.prototype.toMailchimp = function () {
        return {
            email: {email: this.email},
            merge_vars: {
                newsletter: "YES"
            }
        }
    }
};