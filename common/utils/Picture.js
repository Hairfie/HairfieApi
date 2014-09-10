function Picture(picture, container, appUrl) {
  this.picture = picture;
  this.container = container;
  this.appUrl = appUrl;
}

Picture.prototype.publicObject = function() {
    var publicUrl = this.appUrl + '/api/containers/' + this.container + '/download/' + this.picture;

    return {
        picture: this.picture,
        publicUrl: publicUrl
    }
};

module.exports = Picture;