"use strict";

var bunyan = require('bunyan');
var CONFIGS = require("./config.js");

var streams = {level: CONFIGS.application.log_level};
if (CONFIGS.application.log_name) {
  streams.path = CONFIGS.application.log_path + CONFIGS.application.log_name;
} else {
  streams.stream = process.stdout;
}
var log = bunyan.createLogger({name: 'cedilla', streams: [streams]});

module.exports = exports = log;
