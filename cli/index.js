'use strict';

var app = require('..');
var program = require('commander');

app.emit('started'); // TODO: models setup should not depend on server

var commands = [
    'remove-business',
    'remove-hairfie',
    'remove-business-review',
    'save-all-businesses',
    'build-search-index',
    'configure-algolia',
    'send-business-review-requests',
    'update-mailchimp',
    'add-tag',
    'send-booking-reminder',
    'update-yelp',
    'update-pages-jaunes'
];

commands.forEach(function (command) {
    require('./'+command+'.js')(program, app);
});

program
    .command('*')
    .action(function () {
        console.error('C\'est pas comme ça que ça marche !');
        process.exit(1);
    });

module.exports = {
    run: function (argv) {
        program.parse(argv);
        if (!program.args.length) program.help();
    }
};
