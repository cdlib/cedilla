"use strict";

var express = require('express');
var router = express.Router();

var CONFIGS = require("./config.js");
var log = require('./logger.js');
var url = require('url');
var uuid = require('node-uuid');
var helper = require("./utils/helper.js");
var OpenUrlParser = require("./parsers/openurl.js");

router.get('/', function(request, response, next) {
  var host = 'http://' + request.hostname + ':' + CONFIGS.application.port;

  var data = {
    title: 'Cedilla - Test Page',
    host: host
  };

  response.render('index', data);

  next();
});

router.get('/citation', function(request, response) {
  var query = url.parse(request.url).query,
          id = uuid.v4();

  log.debug({object: 'router.js', target: '/citation', openurl: query, request_id: id}, 'Received request to translate openUrl to citation.');

  var parser = new OpenUrlParser(query);

  parser.buildItemsFromQueryString(query, function(item) {
    var hash = helper.itemToMap(item);

    log.debug({object: 'router.js', target: '/citation', requested_citation: hash, request_id: id}, 'Transformed OpenUrl into Citation');

    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    response.writeHead(200);
    response.end(JSON.stringify(hash));
  });
  
});

module.exports = exports = router;