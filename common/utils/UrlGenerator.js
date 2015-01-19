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
    return this.generate('hairfie', {id: hairfie.id});
};

UrlGenerator.prototype.user = function (user) {
    return this.generate('user', {id: user.id});
};

UrlGenerator.prototype.business = function (business) {
    return this.generate('business', {id: business.id, slug: business.slug()});
};

UrlGenerator.prototype.resetPassword = function (user, token) {
    return this.generate('resetPassword', {userId: user.id, token: token.id});
};

UrlGenerator.prototype.watermark = function (picture) {
    return this.generate('asset', {path: picture});
};

UrlGenerator.prototype.businessReviewRequest = function (businessReviewRequest) {
    return this.generate('businessReviewRequest', {businessReviewRequestId: businessReviewRequest.id});
};

UrlGenerator.prototype.acceptBusinessMemberClaim = function (businessMemberClaim) {
    return this.generate('acceptBusinessMemberClaim', {id: businessMemberClaim.id});
};

UrlGenerator.prototype.refuseBusinessMemberClaim = function (businessMemberClaim) {
    return this.generate('refuseBusinessMemberClaim', {id: businessMemberClaim.id});
};

UrlGenerator.prototype.mailLogo = function () {
    return this.generate('asset', {path: 'img/mail/logo/1.0.0@2x.png'});
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
