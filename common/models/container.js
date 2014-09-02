'use strict';

module.exports = function (Container) {

    var allowedContainers = ['hairfies'];

    // prevent creation of unwanted containers
    Container.beforeRemote('createContainer', function (ctx, container, next) {
        if (-1 === allowedContainers.indexOf(ctx.req.body.name)) {
            return next('The specified container is not allowed');
        }
        next();
    });

}
