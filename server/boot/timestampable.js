'use strict';

module.exports = function (server) {
    for (var modelName in server.models) {
        var Model = server.models[modelName];

        if (Model.definition.settings.timestampable) {
            setupTimestampable(Model);
        }
    }
};

function setupTimestampable(Model) {
    Model.defineProperty('createdAt', { type: Date });
    Model.defineProperty('updatedAt', { type: Date });

    var originalBeforeSave = Model.beforeSave;
    Model.beforeSave = function(next, data) {
        Model.applyTimestamps(data, this.isNewRecord());

        if (originalBeforeSave) {
            originalBeforeSave.apply(this, arguments);
        } else {
            next();
        }
    };

    Model.applyTimestamps = function(data, creation) {
        data.updatedAt = new Date();
        if (creation) {
            data.createdAt = data.updatedAt;
        }
    };
}
