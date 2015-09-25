var repl = require("repl");
var lodash = require('lodash');
var Q = require('q');


// environment configuration
var env = process.env.NODE_ENV || "dev";

var app = require('./');
var Place = app.models.Place;
var User = app.models.User;
var Hairfie = app.models.Hairfie;
var Business = app.models.Business;
var BusinessMember = app.models.BusinessMember;
var Booking = app.models.Booking;
var AlgoliaSearchEngine = app.models.AlgoliaSearchEngine;
var Mailchimp = app.models.Mailchimp;


var cloudinary = require('cloudinary');
cloudinary.config({cloudName: process.env.CLOUDINARY_CLOUD_NAME,apiKey: process.env.CLOUDINARY_API_KEY,apiSecret: process.env.CLOUDINARY_API_SECRET});


// open the repl session
var replServer = require('repl').start({
  prompt: "HairfieAPI (" + env + ") > ",
});

replServer.context.app = app;
replServer.context.lodash = lodash;
replServer.context.Q = Q;

replServer.context.Place = Place;
replServer.context.User = User;
replServer.context.Hairfie = Hairfie;
replServer.context.Business = Business;
replServer.context.BusinessMember = BusinessMember;
replServer.context.Booking = Booking;
replServer.context.Mailchimp = Mailchimp;
replServer.context.AlgoliaSearchEngine = AlgoliaSearchEngine;

replServer.context.cloudinary = cloudinary;



replServer.context.find = find;
replServer.context.findOne = findOne;
replServer.context.findByIds = findByIds;
replServer.context.all = all;
replServer.context.log = log;
replServer.context.save = save;
replServer.context.collection = collection;
replServer.context.update = update;

function all(fn) {
    return function (items) {
        return Q.all(items.map(fn));
    };
}

function find(Model, filter) {
    return Q.ninvoke(Model, 'find', filter);
}

function findOne(Model, filter) {
    return Q.ninvoke(Model, 'findOne', filter);
}

function findByIds(Model, ids) {
    return Q.ninvoke(Model, 'findByIds', ids);
}

function log(message) {
    return function () {
        console.log(message);
        return Q.resolve();
    };
}


function save(model) {
    return Q.ninvoke(model, 'save', {validate: false});
}

function collection(Model) {
    return Model.dataSource.connector.collection(Model.definition.name);
}

function update(Model, where, update) {
    return Q.ninvoke(collection(Model), 'update', where, update, {multi: true});
}