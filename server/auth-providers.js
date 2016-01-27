'use strict';

module.exports = {
    'facebook-token-auth': {
        provider: 'facebook',
        module: 'passport-facebook-token',
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        profileFields: ["gender","link","locale","name","timezone","verified","email","updated_time"],
        scope: ['email']
    },
    'facebook-token-link': {
        provider: 'facebook',
        link: true,
        module: 'passport-facebook-token',
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        profileFields: ["gender","link","locale","name","timezone","verified","email","updated_time"],
        scope: ['email']
    }
};
