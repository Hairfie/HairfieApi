function Picture(picture, container, appUrl) {
  this.picture = picture;
  this.container = container;
  this.appUrl = appUrl;
}

Picture.prototype.publicObject = function() {
    return {
        picture: this.picture,
        publicUrl: this.appUrl + '/api/containers/' + this.container + '/download/' + this.picture
    }
};

module.exports = Picture;