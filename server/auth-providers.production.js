module.exports = {
    'facebook-token': {
        provider: 'facebook',
        module: 'passport-facebook-token',
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        scope: ['email']
    }
};
