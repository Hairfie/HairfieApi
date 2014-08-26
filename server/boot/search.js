'use strict';

module.exports = function (app) {

    var searchEngine = app.models.SearchEngine;

    // @todo move the mapping into models configuration
    // @node need to find a way to encapsulate behaviors

    searchEngine.defineMapping('business', {
        business: {
            properties: {
                name: { type: 'string', store: false },
                gps:  { type: 'geo_point', store: false },
            }
        }
    });

}
