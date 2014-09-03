'use strict';

var IncomingForm = require('formidable');
var StringDecoder = require('string_decoder').StringDecoder;
var md5 = require('MD5');
var crypto = require('crypto');

module.exports = function (Container) {

    Container.on('attached', function (app) {
        // Generate random filenames
        //
        // @note Seems we need to define the remote from this hook because we
        //       need to override the data store's one
        //
        // @todo Find a way to rename the file without copying the whole upload
        //       function
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

    Container.beforeRemote('*', function (ctx, _, next) {
        if (ctx.req.params.container) {
            // @todo As soon as we can override non-scalar values in env
            //       specific config, take containers from config
            ctx.req.params.container = [
                'hairfie',
                process.env.NODE_ENV,
                ctx.req.params.container
            ].join('-');
        }
        next();
    });

    // prevent file's removal
    Container.on('attached', function (app) {
        Container.destroyContainer.shared = false;
        Container.removeFile.shared = false;
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

        // generate random name
        part.filename = md5(crypto.randomBytes(256))+'.'+/(?:\.([^.]+))?$/.exec(part.filename)[1];

        var file = {
            container: container,
            name: part.filename,
            type: part.mime
        };

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
