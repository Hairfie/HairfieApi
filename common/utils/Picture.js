function Picture(picture, container, appUrl) {
  this.picture = picture;
  this.container = container;
  this.appUrl = appUrl;
}

Picture.prototype.publicObject = function() {
    if(this.picture.indexOf("http") == 0) {
        var publicUrl = this.picture;
    } else {
        var publicUrl = this.appUrl + '/api/containers/' + this.container + '/download/' + this.picture;
    }
    return {
        picture: this.picture,
        publicUrl: publicUrl
    }
};

module.exports = Picture;