'use strict';

var app = require('..');
var program = require('commander');

var commands = [
    'remove-business',
    'build-search-index'
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