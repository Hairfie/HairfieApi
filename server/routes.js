'use strict';

module.exports = {
    hairfie: {
        app: 'website',
        path: '/hairfies/:id'
    },
    business: {
        app: 'website',
        path: '/businesses/:id/:slug'
    },
    writeVerifiedBusinessReview: {
        app: 'website',
        path: '/write-business-review/:businessReviewRequestId'
    },
    pictureDownload: {
        path: '/api/containers/:container/download/:name'
    },
    streetView: {
        path: '/service/google/streetview/:latitude/:longitude'
    },
    resetPassword: {
        app: 'website',
        path: '/reset-password/:userId/:token'
    },
    watermark: {
        path: '/:picture'
    }
};
