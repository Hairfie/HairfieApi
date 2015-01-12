'use strict';

function UrlGenerator(options) {
    if (!this instanceof UrlGenerator) return new UrlGenerator(options);
    this.options = options;
}

module.exports = UrlGenerator;

UrlGenerator.prototype.generate = function (name, params) {
    var route  = this.options.routes[name],
        params = params || {};

    if (!route) throw "Route '"+name+"' is not defined.";

    var host = this._getHost(route.app),
        path = injectParams(route.path, params);

    return assemble(host, path);
};

UrlGenerator.prototype.home = function () {
    return this.pathToUrl('/');
};

UrlGenerator.prototype.hairfie = function (hairfie) {
    return this.generate('hairfie', {id: hairfie.id}, 'web');
};

UrlGenerator.prototype.user = function (user) {
    return this.generate('user', {id: user.id});
};

UrlGenerator.prototype.business = function (business) {
    return this.generate('business', {id: business.id, slug: business.slug()}, 'web');
};

UrlGenerator.prototype.resetPassword = function (user, token) {
    return this.generate('resetPassword', {userId: user.id, token: token.id});
};

UrlGenerator.prototype.watermark = function (picture) {
    return this.generate('watermark', {picture: picture});
};

UrlGenerator.prototype.writeVerifiedBusinessReview = function (businessReviewRequest) {
    return this.generate('writeVerifiedBusinessReview', {businessReviewRequestId: businessReviewRequest.id});
};

UrlGenerator.prototype._getHost = function (app) {
    var app  = app || this.options.defaultApp,
        host = this.options.baseUrl[app];

    if (!host) throw "Host for app '"+app+"' is not defined.";

    return host;
};

function injectParams(str, params) {
    for (var k in params) {
        str = str.replace(':'+k, params[k]);
    }

    return str;
}

function assemble(host, path) {
    return host.replace(/\/$/, '')+path;
}
