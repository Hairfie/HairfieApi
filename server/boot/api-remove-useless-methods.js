'use strict';

/**
 * @note this boot script must be loaded before the explorer's one
 */
module.exports = function (server) {
    // remove useless API methods
    for (var modelName in server.models) {
        var Model  = server.models[modelName],
            shared = Model.sharedClass,
            names  = Model.definition.settings.sharedMethodNames;

        if (!names) continue;

        Model.sharedClass.methods()
            .map(function (method) { return method.name; })
            .filter(function (name) { return -1 == names.indexOf(name); })
            .map(function (name) {
                (shared.find(name, true) || shared.find(name, false)).shared = false;
            });
    }
}
