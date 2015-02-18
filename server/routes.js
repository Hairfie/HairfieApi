'use strict';

module.exports = {
    api: {
        path: '/api/:path'
    },
    hairfie: {
        app: 'website',
        path: '/hairfies/:id'
    },
    business: {
        app: 'website',
        path: '/businesses/:id/:slug'
    },
    businessReviewRequest: {
        app: 'website',
        path: '/write-business-review/:businessReviewRequestId'
    },
    pictureDownload: {
        app: 'cdn',
        path: '/api/containers/:container/download/:name'
    },
    streetView: {
        path: '/service/google/streetview/:latitude/:longitude'
    },
    resetPassword: {
        app: 'website',
        path: '/reset-password/:userId/:token'
    },
    asset: {
        path: '/:path'
    },
    acceptBusinessMemberClaim: {
        path: '/api/businessMemberClaims/:id/accept'
    },
    refuseBusinessMemberClaim: {
        path: '/api/businessMemberClaims/:id/refuse'
    }
};
