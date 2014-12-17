'use strict';

function Picture(values, app) {
    if (!this instanceof Picture) return new Picture(values, app);

    this.values = values || {};
    this.app = app;
}

module.exports = Picture;

Picture.fromUrl = function (url) {
    return new Picture({url: url});
};

Picture.fromContainer = function (name, container, app) {
    return new Picture({name: name, container: container}, app);
};

Picture.fromDatabaseValue = function (value, container, app) {
    if (!value) return;

    if (isUrl(value)) {
        return Picture.fromUrl(value, app);
    }

    return Picture.fromContainer(value, container, app);
};

Picture.prototype.toDatabaseValue = function () {
    return this.values.name ? this.values.name : this.url();
};

Picture.fromRemoteObject = function (obj, app) {
    if (!obj) return;

    if (obj.name && obj.container) {
        return Picture.fromContainer(obj.name, obj.container);
    }

    console.log('unable to create picture from remote object');
};

Picture.prototype.toRemoteObject = function () {
    var obj = {url: this.url()};

    if (this.values.name) {
        obj.name = this.values.name;
        obj.container = this.values.container;
    }

    return obj;
};

Picture.prototype.url = function () {
    if (this.values.name) {
        return this.app.generateUrl('pictureDownload', {
            container: this.values.container,
            name: this.values.name
        }, 'cdn');
    }

    return this.values.url;
};

function isUrl(name) {
    return 0 === name.indexOf('http:')
        || 0 === name.indexOf('https:');
}
