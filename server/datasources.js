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
        index: {
            business: process.env.ALGOLIA_INDEX_BUSINESS,
            hairfie: process.env.ALGOLIA_INDEX_HAIRFIE
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
            hairfies: process.env.CLOUDINARY_FOLDER_HAIRFIES,
            businesses: process.env.CLOUDINARY_FOLDER_BUSINESSES,
            users: process.env.CLOUDINARY_FOLDER_USERS,
            categories: process.env.CLOUDINARY_FOLDER_CATEGORIES,
            places: process.env.CLOUDINARY_FOLDER_PLACES
        }
    },
    amazonS3: {
        name: 'amazonS3',
        connector: 'loopback-component-storage',
        provider: 'amazon',
        keyId: process.env.AMAZON_S3_KEY_ID,
        key: process.env.AMAZON_S3_SECRET,
        buckets: {
            hairfies: process.env.AMAZON_S3_BUCKET_HAIRFIES,
            businesses: process.env.AMAZON_S3_BUCKET_BUSINESSES,
            users: process.env.AMAZON_S3_BUCKET_USERS,
            categories: process.env.AMAZON_S3_BUCKET_CATEGORIES,
            places: process.env.AMAZON_S3_BUCKET_PLACES
        }
    }
};
