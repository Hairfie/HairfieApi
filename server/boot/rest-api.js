'use strict';

var Promise = require('../../common/utils/promise');

module.exports = function mountRestApi(server) {
    var restApiRoot = server.get('restApiRoot');
    server.use(restApiRoot, server.loopback.rest());

    var remotes = server.remotes();

    // apply virtual & hidden properties config
    remotes.after('**', function (ctx, next, method) {
        if (!ctx.result) next();
        var Model = method.ctor;

        processResult(Model, ctx.result)
            .then(
                function (result) { ctx.result = result; next(); },
                function (error) { next(error); }
            );
    });
};

function processResult(Model, result) {
    if (Array.isArray(result)) {
        return Promise.map(result, function (record) {
            return processResult(Model, record);
        });
    }

    return isModelRecord(Model, result)
        .then(function (isModelRecord) {
            if (!isModelRecord) return result;

            return Promise(result.toObject())
                .then(function (record) { return addVirtuals(Model, record); })
                .then(function (record) { return removeHidden(Model, record); });
        });
}

function isModelRecord(Model, record) {
    if(record.constructor.definition) {
        return Promise(Model.definition.name == record.constructor.definition.name);
    }

    return Promise(Model.definition._ids.every(function (id) {
        return !! record[id.name];
    }));
}

function addVirtuals(Model, record) {
    var virtuals = Model.definition.settings.virtuals || {};
    var promises = [];

    for (var property in virtuals) if (virtuals.hasOwnProperty(property)) {
        promises.push(function (record) {
            return Promise(virtuals[property](record))
                .then(function (value) {
                    record[property] =  value;
                    return record;
                });
        });
    }

    // @todo optimize (// processing?)
    return Promise.sequence(promises, record);
}

function removeHidden(Model, record) {
    for (var property in record) if (Model.isHiddenProperty(property)) {
        delete record[property];
    }

    return Promise(record);
}
