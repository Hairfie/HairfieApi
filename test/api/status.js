var should = require('chai').should(),
    supertest = require('supertest'),
    app = require('../..'),
    api = supertest(app);

describe('API Status', function () {

    it('should return API status', function (done) {
        api
            .get('/api')
            .expect(200)
            .expect('Content-Type', /application\/json/)
            .end(function (error, response) {
                should.not.exist(error);
                response.body.should.be.an('object');
                response.body.started.should.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
                response.body.uptime.should.be.a('number');

                done();
            })
        ;
    });

});
