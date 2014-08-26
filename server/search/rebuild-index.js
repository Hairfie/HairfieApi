'use strict';

var app = require('../../');

var SearchEngine = app.models.SearchEngine;

SearchEngine.rebuildIndex();
