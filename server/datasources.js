'use strict';

module.exports = {
    hairfieMongo: {
        name: 'hairfieMongo',
        connector: 'mongodb',
        debug: false,
        hostname: process.env.MONGO_HOST,
        port: process.env.MONGO_PORT,
        user: process.env.MONGO_USER,
        password: process.env.MONGO_PASS,
        database: process.env.MONGO_DB
    },
    algoliaSearchEngine: {
        name: "algoliaSearchEngine",
        type: "memory",
        indices: {
            business: {
                index: process.env.ALGOLIA_INDEX_BUSINESS,
                model: 'Business',
                settings: {
                    attributesForFaceting: [
                        'genders',
                        'categories',
                        '_tags'
                    ],
                    attributesToIndex: [
                        'name',
                        'categories',
                        'address.city',
                        '_tags',
                        'address.streetName',
                        'address.zipCode'
                    ],
                    customRanking: [
                        'desc(numHairfies)',
                        'desc(rating)',
                        'desc(numReviews)'
                    ]
                }
            },
            hairfie: {
                index: process.env.ALGOLIA_INDEX_HAIRFIE,
                model: 'Hairfie',
                settings: {
                    attributesForFaceting: [
                        'categories',
                        '_tags',
                        'price.amount'
                    ],
                    attributesToIndex: [
                        'business.name',
                        'business.address.city',
                        'business.address.streetName',
                        'business.address.zipCode',
                        'categories',
                        '_tags'
                    ],
                    customRanking: [
                        'desc(createdAt)',
                        'desc(numLikes)',
                        'desc(lastLikeAt)'
                    ]
                }
            }
        },
        applicationId:  process.env.ALGOLIA_APPLICATION_ID,
        apiKey: process.env.ALGOLIA_API_KEY
    },
    mailer: {
        name: 'mailer',
        connector: 'mail',
        transports: [
            {
                type: 'SMTP',
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                secureConnection: true
            }
        ]
    },
    cloudinary: {
        name: 'cloudinary',
        connector: 'memory',
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
        folders: {
            'hairfies': process.env.CLOUDINARY_FOLDER_HAIRFIES,
            'businesses': process.env.CLOUDINARY_FOLDER_BUSINESSES,
            'business-members': process.env.CLOUDINARY_FOLDER_BUSINESS_MEMBERS,
            'users': process.env.CLOUDINARY_FOLDER_USERS,
            'categories': process.env.CLOUDINARY_FOLDER_CATEGORIES,
            'places': process.env.CLOUDINARY_FOLDER_PLACES
        }
    },
    amazonS3: {
        name: 'amazonS3',
        connector: 'loopback-component-storage',
        provider: 'amazon',
        keyId: process.env.AMAZON_S3_KEY_ID,
        key: process.env.AMAZON_S3_SECRET,
        buckets: {
            'hairfies': process.env.AMAZON_S3_BUCKET_HAIRFIES,
            'businesses': process.env.AMAZON_S3_BUCKET_BUSINESSES,
            'business-members': process.env.AMAZON_S3_BUCKET_BUSINESS_MEMBERS,
            'users': process.env.AMAZON_S3_BUCKET_USERS,
            'categories': process.env.AMAZON_S3_BUCKET_CATEGORIES,
            'places': process.env.AMAZON_S3_BUCKET_PLACES,

            'user-profile-pictures': process.env.AMAZON_S3_BUCKET_USER_PROFILE_PICTURES,
            'business-pictures': process.env.AMAZON_S3_BUCKET_BUSINESS_PICTURES,
            'category': process.env.AMAZON_S3_BUCKET_CATEGORY,
        }
    },
    kraken: {
        name: 'kraken',
        connector: 'memory',
        apiKey: process.env.KRAKEN_API_KEY,
        apiSecret: process.env.KRAKEN_API_SECRET,
        awsKey: process.env.KRAKEN_AWS_KEY,
        awsSecret: process.env.KRAKEN_AWS_SECRET,
        awsS3Bucket: process.env.KRAKEN_AWS_S3_BUCKET,
        awsS3Region: process.env.KRAKEN_AWS_S3_REGION
    },
    twilio: {
        name: 'twilio',
        connector: 'memory',
        twilioAccountSID: process.env.TWILIO_ACCOUNT_SID,
        twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
        twilioNumber: process.env.TWILIO_NUMBER
    }
};
