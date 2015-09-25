'use strict';

var Promise = require('../../common/utils/Promise');
var moment = require('moment-timezone');
var Hooks = require('./hooks');
var phone = require('phone');
var semver = require('semver');
var Control = require('../utils/AccessControl');

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
};