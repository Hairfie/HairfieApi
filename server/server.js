if (!!process.env.NEW_RELIC_ENABLED) {
    console.log('Newrelic in da place!');
    require('newrelic');
}

// require utils
require('../common/utils');

var loopback = require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();

var loopbackPassport = require('loopback-component-passport');
var PassportConfigurator = loopbackPassport.PassportConfigurator;
var passportConfigurator = new PassportConfigurator(app);

var path = require('path');
app.use(loopback.static(path.resolve(__dirname, '../client')));

function loadConfig(name, env) {
    var candidates = [
        './'+name,
        './'+name+'.local',
        './'+name+'.'+process.env.NODE_ENV
    ];

    var configs = candidates
        .map(function (candidate) {
            try { return require(candidate+'.js'); } catch(e) {}
            try { return require(candidate+'.json'); } catch(e) {}
        })
        .filter(function (config) {
            return !!config;
        })
    ;

    if (configs.length === 0) {
        return;
    }

    var result = {};
    configs.forEach(function (config) {
        for (var key in config) if (config.hasOwnProperty(key)) {
            result[key] = config[key];
        }
    });

    return result;
}

var passportConfig = loadConfig('auth-providers', process.env.NODE_ENV);
if (!passportConfig) {
    console.log('Unable to load passport config.');
    process.exit(1);
}

// request pre-processing middleware
//app.use(loopback.token({
//    model: app.models.AccessToken
//}));
app.use(function (req, res, next) {
    // temporary replace token middleware
    if (req.accessToken) return next();

    app.models.accessToken.findForRequest(req, {}, function(err, token) {
        req.accessToken = token || null;
        next(err);
    });
});
app.use(loopback.compress());
app.use(loopback.urlencoded());
app.use(loopback.json());
app.use(loopback.logger('dev'));

// -- Add your pre-processing middleware here --

// boot scripts mount components like REST API
boot(app, {
    appRootDir: __dirname,
    dataSources: loadConfig('datasources', process.env.NODE_ENV)
});

// setup passport
var passport = passportConfigurator.init();
passportConfigurator.setupModels();
for (var s in passportConfig) {
    var c = passportConfig[s];
    c.session = c.session !== false;
    c.profileToUser = app.models.User.profileToUser;
    passportConfigurator.configureProvider(s, c);
}

// add endpoint to send token to
app.use(
    '/auth/facebook/token',
    passport.authenticate('facebook-token', {
        scope: passportConfig['facebook-token'].scope
    }),
    function (req, res) {
        if (!req.user) return res.status(401);

        req.user.createAccessToken(null, function (error, token) {
            if (error) return res.status(500);

            res.send(token);
        });
    }
);

// -- Mount static files here--
// All static middleware should be registered at the end, as all requests
// passing the static middleware are hitting the file system
// Example:
//   app.use(loopback.static(path.resolve(__dirname', '../client')));

// Requests that get this far won't be handled
// by any middleware. Convert them into a 404 error
// that will be handled later down the chain.
app.use(loopback.urlNotFound());

// The ultimate error handler.
app.use(loopback.errorHandler());

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    console.log('Web server listening at: %s', app.get('url'));
  });
};

// start the server if `$ node server.js`
if (require.main === module) {
  app.start();
}
