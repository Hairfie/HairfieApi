'use strict';

var app = require('..');
var program = require('commander');

var commands = [
    'remove-business'
];

commands.forEach(function (command) {
    require('./'+command+'.js')(program, app);
});

module.exports = {
    run: function (argv) {
        program.parse(argv);
    }
};
