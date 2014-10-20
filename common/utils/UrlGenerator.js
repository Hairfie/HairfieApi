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
}

UrlGenerator.prototype.hairfie = function (hairfie) {
    return this.generate('hairfie', {id: hairfie.id});
}

UrlGenerator.prototype.pathToUrl = function (path) {
    return this.options.baseUrl+path;
}
