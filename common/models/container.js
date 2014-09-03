'use strict';

var IncomingForm = require('formidable');
var StringDecoder = require('string_decoder').StringDecoder;
var md5 = require('MD5');
var crypto = require('crypto');

module.exports = function (Container) {

    var allowedContainers = ['hairfies'];

    Container.on('attached', function (app) {
        // override upload method so we can rename files
        Container.upload = function (req, res, cb) {
            var client = Container.dataSource.connector.client;
            upload(client, req, res, req.params.container, cb);
        }

        Container.remoteMethod('upload', {
            accepts: [
                {arg: 'req', type: 'object', 'http': {source: 'req'}},
                {arg: 'res', type: 'object', 'http': {source: 'res'}}
            ],
            returns: {arg: 'result', type: 'object'},
            http: {verb: 'post', path: '/:container/upload'}
        });

    });

    // prevent creation of unwanted containers
    Container.beforeRemote('createContainer', function (ctx, container, next) {
        if (-1 === allowedContainers.indexOf(ctx.req.body.name)) {
            return next('The specified container is not allowed');
        }
        next();
    });

}

function upload(provider, req, res, container, cb) {
  var form = new IncomingForm();
  container = container || req.params.container;
  var fields = {}, files = {};
  form.handlePart = function (part) {
    var self = this;

    if (part.filename === undefined) {
      var value = ''
        , decoder = new StringDecoder(this.encoding);

      part.on('data', function (buffer) {
        self._fieldsSize += buffer.length;
        if (self._fieldsSize > self.maxFieldsSize) {
          self._error(new Error('maxFieldsSize exceeded, received ' + self._fieldsSize + ' bytes of field data'));
          return;
        }
        value += decoder.write(buffer);
      });

      part.on('end', function () {
        var values = fields[part.name];
        if (values === undefined) {
          values = [value];
          fields[part.name] = values;
        } else {
          values.push(value);
        }
        self.emit('field', part.name, value);
      });
      return;
    }

    this._flushing++;

    var file = {
      container: container,
      name: part.filename,
      type: part.mime
    };

    // generate random name
    file.name = md5(crypto.randomBytes(256))+'.'+/(?:\.([^.]+))?$/.exec(file.name)[1];

    self.emit('fileBegin', part.name, file);

    var headers = {};
    if ('content-type' in part.headers) {
      headers['content-type'] = part.headers['content-type'];
    }
    var writer = provider.upload({container: container, remote: part.filename});

    var endFunc = function () {
      self._flushing--;
      var values = files[part.name];
      if (values === undefined) {
        values = [file];
        files[part.name] = values;
      } else {
        values.push(file);
      }
      self.emit('file', part.name, file);
      self._maybeEnd();
    };

    part.pipe(writer, { end: false });
    part.on("end", function () {
      writer.end();
      endFunc();
    });
  };

  form.parse(req, function (err, _fields, _files) {
    if (err) {
      console.error(err);
    }
    cb && cb(err, {files: files, fields: fields});
  });
}
