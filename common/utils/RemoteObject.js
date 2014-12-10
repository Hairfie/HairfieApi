'use strict';

var Promise = require('./Promise');

module.exports = {
    related: related
};

function related(model, name, context) {
    return Promise
        .npost(model, name)
        .then(function (relatedModel) {
            return relatedModel.toRemoteShortObject(context);
        });
}
