'use strict';

function UrlGenerator(options) {
    if (!this instanceof UrlGenerator) return new UrlGenerator(options);
    this.options = options;
}

module.exports = UrlGenerator;

UrlGenerator.prototype.generate = function (name, params, context) {
    var route  = this.options.routes[name],
        params = params || {};
    if (!route) throw "Route '"+name+"' is not defined.";

    var host = this._getHost(route.app, context),
        path = injectParams(route.path, params);

    return assemble(host, path);
};

UrlGenerator.prototype.api = function (path) {
    return this.generate('api', {path: path});
};

UrlGenerator.prototype.hairfie = function (hairfie, context) {
    return this.generate('hairfie', {id: hairfie.id}, context);
};

UrlGenerator.prototype.user = function (user) {
    return this.generate('user', {id: user.id});
};

UrlGenerator.prototype.business = function (business, context) {
    return this.generate('business', {id: business.id, slug: business.slug()}, context);
};

UrlGenerator.prototype.resetPassword = function (user, token) {
    return this.generate('resetPassword', {userId: user.id, token: token.id});
};

UrlGenerator.prototype.watermark = function (picture) {
    return this.generate('asset', {path: picture});
};

UrlGenerator.prototype.businessReviewRequest = function (businessReviewRequest) {
    return this.generate('businessReviewRequest', {requestId: businessReviewRequest.id, businessId: businessReviewRequest.businessId});
};

UrlGenerator.prototype.acceptBusinessMemberClaim = function (businessMemberClaim) {
    return this.generate('acceptBusinessMemberClaim', {id: businessMemberClaim.id});
};

UrlGenerator.prototype.refuseBusinessMemberClaim = function (businessMemberClaim) {
    return this.generate('refuseBusinessMemberClaim', {id: businessMemberClaim.id});
};

UrlGenerator.prototype.mailImage = function (path) {
    return this.generate('asset', {path: 'img/mail/'+path});
};

UrlGenerator.prototype._getHost = function (app, context) {
    var app  = app || this.options.defaultApp,
        host = this.options.baseUrl[app];

    if(app === 'website') {
        try {
            host = context.localiseWebUrl(host);
        } catch(err) {
            host = host + '/fr';
        }
    }

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
