'use strict';

var Q = require('q');
var MailchimpLite = require('mailchimp-lite');
var _ = require('lodash');

module.exports = function (Mailchimp) {
    var client;

    Mailchimp.on('dataSourceAttached', function () {
        client = new MailchimpLite({
            key: Mailchimp.dataSource.settings.apiKey,
            datacenter: Mailchimp.dataSource.settings.datacenter
        });
    });

    function formatUserForMailchimp(user) {
        return {
            email: {email: user.email},
            merge_vars: {
                fname: user.firstName,
                lname: user.lastName,
                registered: "YES"
            }
        }
    }

    Mailchimp.updateAllUser = function () {
        var listId = Mailchimp.dataSource.settings.listId;
        var User = Mailchimp.app.models.User;

        return Q.ninvoke(User, 'find', {})
        .then(function(users) {
            return client.v2.post('/lists/batch-subscribe', {
                id: listId,
                update_existing: true,
                double_optin: false,
                replace_interests: false,
                batch: _.map(users, formatUserForMailchimp)
            })
        })
        .then((response) => { console.log(response); })
        .catch((error) => {
            console.log(error); // Mailchimp Error: 401
            console.log(error.response);
        });
    };

    Mailchimp.addToList = function (subscriber) {
        var listId = Mailchimp.dataSource.settings.listId;

        return client.post('/lists/' + listId + '/members', {
            email_address: subscriber.email,
            status: "subscribed"
        })
        .then(function(response) {
            console.log("success", response);
            return response;
        })
        .catch((error) => {
            console.log(error); // Mailchimp Error: 401
            console.log(error.response);
        });
    };
};