"use strict";

// namespace for application
global.cdla = {};

var CONFIGS = require("./config.js");

var i = 0;

var waitForConfigs = setInterval(function() {
  if (typeof CONFIGS.application !== 'undefined') {
    clearInterval(waitForConfigs);

    global.cdla.helper = require("./utils/helper.js");
    global.cdla.Item = require("./models/item.js");

  } else if (i >= 1000) {
    throw "Config load timed out";
  }
  i++;
}, 200);
