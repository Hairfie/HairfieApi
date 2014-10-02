'use strict';

function Picture(values, appUrl) {
    if (!this instanceof Picture) return new Picture(values, url);

    values = values || {};

    this.name = values.name;
    this.container = values.container;
    this.url = values.url;
    this.appUrl = appUrl;
}

module.exports = Picture;

Picture.fromUrl = function (url) {
    return new Picture({url: url});
};

Picture.fromContainer = function (name, container, appUrl) {
    return new Picture({name: name, container: container}, appUrl);
};

Picture.fromDatabaseValue = function (value, container, app) {
    if (!value) return;

    if (isUrl(value)) {
        return Picture.fromUrl(value, app.get('url'));
    }

    return Picture.fromContainer(value, container, app.get('url'));
};

Picture.prototype.toDatabaseValue = function () {
    return this.name ? this.name : this.url;
};

Picture.fromRemoteObject = function (obj, app) {
    if (!obj) return;

    if (obj.name && obj.container) {
        return Picture.fromContainer(obj.name, obj.container);
    }

    console.log('unable to create picture from remote object');
};

Picture.prototype.toRemoteObject = function () {
    if (this.name) {
        return {
            name        : this.name,
            container   : this.container,
            url         : this.appUrl + '/api/containers/'+this.container+'/download/'+this.name
        };
    }

    return {
        url : this.url
    };
};

function isUrl(name) {
    return 0 === name.indexOf('http:')
        || 0 === name.indexOf('https:');
}
