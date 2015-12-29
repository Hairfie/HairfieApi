'use strict';

module.exports = {
    api: {
        path: '/v1.2/:path'
    },
    hairfie: {
        app: 'website',
        path: '/hairfie/:id'
    },
    business: {
        app: 'website',
        path: '/coiffeur/:id/:slug'
    },
    businessReviewRequest: {
        app: 'website',
        path: '/deposer-un-avis/?requestId=:requestId&businessId=:businessId'
    },
    pictureDownload: {
        app: 'cdn',
        path: '/v1.2/containers/:container/download/:name'
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
        path: '/v1.2/businessMemberClaims/:id/accept'
    },
    refuseBusinessMemberClaim: {
        path: '/v1.2/businessMemberClaims/:id/refuse'
    },
    bookingConfirmation: {
        app: 'website',
        path: '/reservation/:id'
    }
};
