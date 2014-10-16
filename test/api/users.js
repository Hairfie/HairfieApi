var should = require('chai').should(),
    supertest = require('supertest'),
    app = require('../..'),
    api = supertest(app),
    helper = require('./helper.js')(app);

describe('POST /api/users', function ()  {

    beforeEach(function (done) {
        helper.clearEverything().then(done.bind(null, null), done);
    });

    it('should create user and serve it with an accessToken property', function (done) {
        api
            .post('/api/users')
            .send({
                gender      : 'MALE',
                firstName   : 'George',
                lastName    : 'Abitbol',
                email       : 'george.abitbol@gmail.com',
                password    : 'georgepass'
            })
            .expect(201)
            .expect('Content-Type', /application\/json/)
            .end(function (error, response) {
                should.not.exist(error);

                response.body.should.be.an('object');
                response.body.should.have.property('id');
                response.body.should.have.property('gender', 'MALE');
                response.body.should.have.property('firstName', 'George');
                response.body.should.have.property('lastName', 'Abitbol');
                response.body.should.have.property('email', 'george.abitbol@gmail.com');
                response.body.should.not.have.property('password');
                response.body.should.have.property('accessToken');
                response.body.accessToken.should.be.an('object');
                response.body.accessToken.should.have.property('id');

                done();
            })
        ;
    });

});

describe('POST /api/users/login', function () {
    var george;

    before(function (done) {
        helper.clearEverything()
            .then(function () {
                return helper.createUser({email: 'george@gmail.com', password: 'georgepass'});
            })
            .then(function (user) {
                george = user;
            })
            .then(done.bind(null, null), done);
    });

    it('should return access token resource when valid credentials are sent', function (done) {
        api
            .post('/api/users/login')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                email   : 'george@gmail.com',
                password: 'georgepass',
            })
            .expect(200)
            .expect('Content-Type', /application\/json/)
            .end(function (error, response) {
                should.not.exist(error);

                response.body.should.be.an('object');
                response.body.should.have.property('id');
                response.body.should.have.property('userId');

                done();
            })
        ;
    });

    it('should not return access token resource when invalid password is sent', function (done) {
        api
            .post('/api/users/login')
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .send({
                email   : 'george@gmail.com',
                password: 'some$secret',
            })
            .expect(401, done)
        ;
    });

});

describe('GET /api/users/:id', function () {
    var george      = null,
        sarah       = null,
        georgeToken = null;

    beforeEach(function (done) {
        helper.clearEverything()
            .then(function () {
                return helper.createUser({firstName: 'George'});
            })
            .then(function (user) {
                george = user;
                return helper.createAccessTokenForUser(george);
            })
            .then(function (token) {
                georgeToken = token;
                return helper.createUser({firstName: 'Sarah'});
            })
            .then(function (user) {
                sarah = user;
            })
            .then(done, done);
    });

    it('should not serve user resource to anonymous requests', function (done) {
        api.get('/api/users/'+george.id).expect(401, done);
    });

    it('should serve user resource to authenticated user', function (done) {
        api
            .get('/api/users/'+george.id)
            .set('Authorization', georgeToken.id)
            .expect(200)
            .expect('Content-Type', /application\/json/)
            .end(function (error, response) {
                should.not.exist(error);

                response.body.should.be.an('object');
                response.body.should.have.property('id', george.id.toString());
                response.body.should.have.property('gender', george.gender);
                response.body.should.have.property('firstName', george.firstName);
                response.body.should.have.property('lastName', george.lastName);
                response.body.should.have.property('email', george.email);

                done();
            })
        ;
    });

    it ('should not serve user resource to another authenticated user', function (done) {
        api.get('/api/users/'+sarah.id).set('Authorization', georgeToken.id).expect(403, done);
    });

});

describe('PUT /api/users/:id', function () {
    var george      = null,
        sarah       = null,
        georgeToken = null;

    beforeEach(function (done) {
        helper.clearEverything()
            .then(function () {
                return helper.createUser({firstName: 'George'});
            })
            .then(function (user) {
                george = user;
                return helper.createAccessTokenForUser(george);
            })
            .then(function (token) {
                georgeToken = token;
                return helper.createUser({firstName: 'Sarah'});
            })
            .then(function (user) {
                sarah = user;
            })
            .then(done, done);
    });

    it('should update user');
    it('should reject non authenticated requests');
    it('should reject requests from another user');
});
