'use strict';

function UrlGenerator(options) {
    if (!this instanceof UrlGenerator) return new UrlGenerator(options);
    this.options = options;
}

module.exports = UrlGenerator;

UrlGenerator.prototype.generate = function (name, params, customUrlType) {
    var route  = this.options.routes[name],
        params = params || {};

    if (!route) throw "Route '"+name+"' is not defined.";

    var path = route.path;

    for (var k in params) {
        path = path.replace(':'+k, params[k]);
    }

    if(customUrlType == 'cdn') {
        return this.pathToCdnUrl(path);
    } else if(customUrlType == 'web'){
        return this.pathToWebUrl(path);
    } else {
        return this.pathToUrl(path);
    }
};

UrlGenerator.prototype.home = function () {
    return this.pathToUrl('/');
};

UrlGenerator.prototype.hairfie = function (hairfie) {
    return this.generate('hairfies', {id: hairfie.id}, 'web');
};

UrlGenerator.prototype.user = function (user) {
    return this.generate('user', {id: user.id});
};

UrlGenerator.prototype.business = function (business) {
    return this.generate('businesses', {id: business.id, slug: business.slug()}, 'web');
};

UrlGenerator.prototype.watermark = function (picture_path) {
    return this.options.baseUrl.replace(/\/$/, '')+picture_path;
};

UrlGenerator.prototype.pathToUrl = function (path) {
    return this.options.baseUrl.replace(/\/$/, '')+path;
};

UrlGenerator.prototype.pathToWebUrl = function (path) {
    return this.options.webUrl.replace(/\/$/, '')+path;
};

UrlGenerator.prototype.pathToCdnUrl = function (path) {
    return this.options.cdnUrl.replace(/\/$/, '')+path;
};