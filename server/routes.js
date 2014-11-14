'use strict';

module.exports = {
    user: {
        verb: 'GET',
        path: '/user/:id'
    },
    hairfie: {
        verb: 'GET',
        path: '/hairfie/:id'
    },
    hairfies: {
        verb: 'GET',
        path: '/hairfies/:id'
    },
    business: {
        verb: 'GET',
        path: '/business/:id/:slug'
    },
    businesses: {
        verb: 'GET',
        path: '/businesses/:id/:slug'
    },
    pictureDownload: {
        verb: 'GET',
        path: '/api/containers/:container/download/:name'
    },
    streetView: {
        verb: 'GET',
        path: '/service/google/streetview/:latitude/:longitude'
    }
};
