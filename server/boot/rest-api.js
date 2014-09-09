module.exports = function mountRestApi(server) {
    var restApiRoot = server.get('restApiRoot');
    server.use(restApiRoot, server.loopback.rest());

    var remotes = server.remotes();

    // apply virtual & hidden properties config
    remotes.after('**', function (ctx, next, method) {
        var Model = method.ctor;

        if (ctx.result) {
            if (Array.isArray(ctx.result)) {
                ctx.result.forEach(function (record) {
                    if (isModelRecord(Model, record)) {
                        addVirtuals(Model, record);
                        removeHidden(Model, record);
                    }
                });
            } else {
                if (isModelRecord(Model, ctx.result)) removeHidden(Model, addVirtuals(Model, ctx.result));
            }
        }

        next();
    });
};

function isModelRecord(Model, record) {
    if(record.constructor.definition) {
        return Model.definition.name == record.constructor.definition.name;
    } else {
        return Model.definition._ids.every(function (id) {
            return !! record[id.name];
        });
    }
}

function addVirtuals(Model, record) {
    var virtuals = Model.definition.settings.virtuals || {};
    for (var property in virtuals) if (virtuals.hasOwnProperty(property)) {
        record[property] = virtuals[property](record);
    }
}

function removeHidden(Model, record) {
    for (var property in record) if (Model.isHiddenProperty(property)) {
        delete record[property];
    }
}
