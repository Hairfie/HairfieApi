'use strict';

var Q = require('q');
var MailchimpLite = require('mailchimp-lite');

module.exports = function (Mailchimp) {
    var client;

    Mailchimp.on('dataSourceAttached', function () {
        client = new MailchimpLite({
            key: Mailchimp.dataSource.settings.apiKey,
            datacenter: Mailchimp.dataSource.settings.datacenter
        });
    });


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