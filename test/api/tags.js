var should = require('chai').should(),
    supertest = require('supertest'),
    app = require('../..'),
    api = supertest(app),
    helper = require('./helper.js')(app);

describe('GET /api/tags', function () {
    var fooCategory, barCategory, plipTag, plapTag, plopTag;

    before(function (done) {
        helper
            .clearEverything()
            .then(function () {
                return [
                    helper.createTagCategory({name: {fr: 'Foo FR', en: 'Foo EN'}}),
                    helper.createTagCategory({name: {fr: 'Bar FR', en: 'Bar EN'}}),
                ];
            })
            .spread(function (foo, bar) {
                fooCategory = foo;
                barCategory = bar;

                return [
                    helper.createTagWithCategory(fooCategory, {
                        name: {fr: 'Plip FR', en: 'Plip EN'}
                    }),
                    helper.createTagWithCategory(barCategory, {
                        name: {fr: 'Plap FR', en: 'Plap EN'}
                    }),
                    helper.createTagWithCategory(barCategory, {
                        name: {fr: 'Plop FR', en: 'Plop EN'}
                    }),
                ];
            })
            .spread(function (plip, plap, plop) {
                plipTag = plip;
                plapTag = plap;
                plopTag = plop;
            })
            .then(done.bind(null, null), done)
        ;
    });

    [{desc: 'english when no language is specified', accept: null, lang: 'EN'}
    ,{desc: 'french when it is the preferred language', accept: 'fr; q=1.0, en; q=0.5', lang: 'FR'}
    ,{desc: 'english when it is the preferred language', accept: 'en; q=1.0, en; q=0.5', lang: 'EN'}
    ,{desc: 'french when it is the lang of the preferred locale', accept: 'fr_BE; q=1.0, en; q=0.5', lang: 'FR'}
    ,{desc: 'english when accepted language is not supported', accept: 'jp; q=1.0', lang: 'EN'}
    ].map(function (config) {
        it('should return resources in '+config.desc, function (done) {
            api
                .get('/api/tags')
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .set('Accept-Language', config.accept)
                .expect(200)
                .expect('Content-Type', /application\/json/)
                .end(function (error, response) {
                    should.not.exist(error);

                    response.body.should.be.an('array');
                    response.body.should.have.length(3);

                    response.body[0].should.be.an('object');
                    response.body[0].should.have.property('id');
                    response.body[0].should.have.property('name', 'Plip '+config.lang);
                    response.body[0].should.have.property('category');
                    response.body[0].category.should.be.an('object');
                    response.body[0].category.should.have.property('id');
                    response.body[0].category.should.have.property('name', 'Foo '+config.lang);

                    response.body[1].should.be.an('object');
                    response.body[1].should.have.property('id');
                    response.body[1].should.have.property('name', 'Plap '+config.lang);
                    response.body[1].should.have.property('category');
                    response.body[1].category.should.be.an('object');
                    response.body[1].category.should.have.property('id');
                    response.body[1].category.should.have.property('name', 'Bar '+config.lang);

                    response.body[2].should.be.an('object');
                    response.body[2].should.have.property('id');
                    response.body[2].should.have.property('name', 'Plop '+config.lang);
                    response.body[2].should.have.property('category');
                    response.body[2].category.should.be.an('object');
                    response.body[2].category.should.have.property('id');
                    response.body[2].category.should.have.property('name', 'Bar '+config.lang);

                    done();
                })
            ;
        });
    });
});

describe('POST /api/tags', function () {
    it('should not be allowed', function (done) {
            api.post('/api/tags').expect(404, done);
    });
});

describe('PUT /api/tags', function () {
    var tag;

    before(function (done) {
        helper
            .clearEverything()
            .then(helper.createTagCategory.bind(helper, {}))
            .then(helper.createTagWithCategory.bind(helper))
            .then(function (t) {
                tag = t;
                done();
            })
        ;
    });

    it('should not be allowed', function (done) {
        api.post('/api/tags/'+tag.id).expect(404, done);
    });
});

describe('DELETE /api/tags', function () {
    var tag;

    before(function (done) {
        helper
            .clearEverything()
            .then(helper.createTagCategory.bind(helper, {}))
            .then(helper.createTagWithCategory.bind(helper))
            .then(function (t) {
                tag = t;
                done();
            })
        ;
    });

    it('should not be allowed', function (done) {
        api.delete('/api/tags/'+tag.id).expect(404, done);
    });
});
