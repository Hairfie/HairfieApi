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

    var path = route.path;

    for (var k in params) {
        path = path.replace(':'+k, params[k]);
    }

    return this.pathToUrl(path);
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

UrlGenerator.prototype.pathToUrl = function (path) {
    return this.options.baseUrl.replace(/\/$/, '')+path;
};
