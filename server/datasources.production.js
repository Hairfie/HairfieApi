module.exports = {
    hairfieMongo: {
        name: 'hairfieMongo',
        connector: 'mongodb',
        debug: !!process.env.MONDO_DEBUG,
        hostname: process.env.MONGO_HOST,
        port: process.env.MONGO_PORT,
        user: process.env.MONGO_USER,
        password: process.env.MONGO_PASS,
        database: process.env.MONGO_DB
    },
    searchEngine: {
        name: 'searchEngine',
        type: 'memory',
        host: process.env.ELASTIC_HOST,
        port: process.env.ELASTIC_PORT,
        user: process.env.ELASTIC_USER,
        pass: process.env.ELASTIC_PASS,
        index: process.env.ELASTIC_INDEX,
    },
    algoliaSearchEngine: {
        name: "algoliaSearchEngine",
        type: "memory",
        index: {
            "business": "hairfie-production_businesses",
            "hairfie": "hairfie-production_hairfies"
        },
        applicationId: "X9MA7FE0CL",
        adminApiKey: "b6551e8b6dccdd833b0e7b488ba9fb1a"
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
    storage: {
        name: 'storage',
        connector: 'loopback-component-storage',
        provider: 'amazon',
        keyId: process.env.AMAZON_S3_KEY_ID,
        key: process.env.AMAZON_S3_SECRET
    }
};
