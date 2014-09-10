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

        // try shared class
        Model.sharedClass.methods().map(function (method) {
            var name = method.name;
            if (-1 == names.indexOf(name)) {
                (shared.find(name, true) || shared.find(name, false)).shared = false;
            }
        });

        // and static class methods
        for (var propertyName in Model) {
            var property = Model[propertyName];
            if ('function' == typeof property && property.shared) {
                property.shared = false;
            }
        }

        // and static class methods
        for (var propertyName in Model.prototype) {
            var method = shared.find(Model.prototype[propertyName]);
            if (null === method) continue;

            // @todo remove method once PR is merged
            // @see https://github.com/strongloop/strong-remoting/pull/95
        }
    }
}
