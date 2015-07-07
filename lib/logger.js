"use strict";

var bunyan = require('bunyan');
var CONFIGS = require("./config.js");

var mainLog= {level: CONFIGS.application.log_level};
if (CONFIGS.application.log_name) {
  mainLog.path = CONFIGS.application.log_path + CONFIGS.application.log_name;
} else {
  mainLog.stream = process.stdout;
}
var log = bunyan.createLogger({name: 'cedilla', streams: [mainLog]});

module.exports = exports = log;
