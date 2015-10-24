'use strict';

var Q = require('q');
var twilio = require('twilio');

module.exports = function (TextMessage) {
    var client;

    TextMessage.on('dataSourceAttached', function () {
        client = new twilio.RestClient(TextMessage.dataSource.settings.twilioAccountSID, TextMessage.dataSource.settings.twilioAuthToken);
    });

    TextMessage.send = function (toNumber, body) {
        var envLabel = TextMessage.app.get("emailPrefix").replace('[', '').replace(']', '').trim();
        console.log("envLabel", envLabel);

        var Email = TextMessage.app.Email;

        TextMessage.app.models.email.notifyAll('SMS Envoyé', {
            'Destinataire'    : toNumber,
            'From'            : envLabel || "RDV Hairfie",
            'Contenu'         : body
        });

        return client.sendMessage({
            to: toNumber,
            from: envLabel || "RDV Hairfie",
            body: body
        }).then(function(responseData) {
            console.log('Successfully send message', responseData);
            return responseData;
        }).fail(function(error) {
            console.log("error", error);
            return error;
        });
    };
};