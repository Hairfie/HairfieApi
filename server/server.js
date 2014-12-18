if (process.env.NEW_RELIC_LICENSE_KEY) {
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

        if (req.accessToken) {
            app.models.user.findById(req.accessToken.userId, function (error, user) {
                if (error) return next({statusCode: 500, message: 'Error retrieving user'});
                if (!user) return next({statusCode: 500, message: 'Access token\'s user not found'});
                req.user = user;
                next();
            });
        } else {
            next();
        }
    });
});
app.use(loopback.compress());
app.use(loopback.urlencoded());
app.use(loopback.json());
app.use(loopback.logger('dev'));

function corsMiddleware(req, res, next) {
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', req.header('Access-Control-Request-Headers'));
    if ('OPTIONS' == req.method) {
        res.send(200);
    } else {
        next();
    }
};

app.use(corsMiddleware);

// -- Add your pre-processing middleware here --

// setup rewriting rules for backward compatibility

app.post('/api/hairdressers', function (req, res, next) {
    req.body.hidden = false;
    next();
});
app.get('/api/hairfies', function (req, res, next) {
    // rewrite businessId filter
    var hairdresserId = req.query && req.query.filter && req.query.filter.where && req.query.filter.where.hairdresserId;
    if (hairdresserId) {
        req.query.filter.where.businessMemberId = hairdresserId;
        delete req.query.filter.where.hairdresserId;
    }

    next();
});

var rewriteModule = require('http-rewrite-middleware');
app.use(rewriteModule.getMiddleware([
    // hairdresser-favorites -> business-member-favorites
    {from: '^/api/users/([a-z0-9]+)/favorite-hairdressers$', to: '/api/users/$1/favorite-business-members'},
    {from: '^/api/users/([a-z0-9]+)/favorite-hairdressers/([a-z0-9]+)$', to: '/api/users/$1/favorite-business-members/$2'},

    // hairdressers -> business members
    {from: '^/api/hairdressers$', to: '/api/businessMembers'},
    {from: '^/api/hairdressers/([a-z0-9]+)$', to: '/api/businessMembers/$1'},
]));

// boot scripts mount components like REST API
boot(app, {
    appRootDir: __dirname,
    dataSources: loadConfig('datasources', process.env.NODE_ENV)
});

// setup passport
var passport = passportConfigurator.init();
passportConfigurator.setupModels({
  userModel: app.models.user,
  userCredentialModel: app.models.userCredential,
  userIdentityModel: app.models.userIdentity,
});
for (var s in passportConfig) {
    var c = passportConfig[s];
    c.session = c.session !== false;
    c.profileToUser = app.models.User.profileToUser;
    passportConfigurator.configureProvider(s, c);
}

app.use( // TODO remove me
    '/auth/facebook/token',
    passport.authenticate('facebook-token-auth', {
        scope: passportConfig['facebook-token-auth'].scope
    }),
    function (req, res) {
        if (!req.user) return res.status(401);

        req.user.createAccessToken(null, function (error, token) {
            if (error) return res.status(500);

            res.send(token);
        });
    }
);

app.use(
    '/api/auth/facebook/token',
    passport.authenticate('facebook-token-auth', {
        scope: passportConfig['facebook-token-auth'].scope
    }),
    function (req, res) {
        if (!req.user) return res.status(401);

        req.user.createAccessToken(null, function (error, token) {
            if (error) return res.status(500);

            res.send(token);
        });
    }
);

app.use(
    '/api/link/facebook/token',
    passport.authorize('facebook-token-link', {
        scope: passportConfig['facebook-token-link'].scope
    }),
    function (req, res) {
        if (!req.account) return res.status(401);
        res.send({});
    }
);

app.emit('routes defined');

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
  return app.listen(process.env.PORT || 3000, function() {
    app.emit('started');
    console.log('Web server listening at: %s', app.get('url'));
  });
};

// start the server if `$ node server.js`
if (require.main === module) {
  app.start();
}
