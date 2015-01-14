"use strict";

global.CONFIGS = require("./config.js");

var i = 0;

var waitForConfigs = setInterval(function() {
  if (typeof CONFIGS.application !== 'undefined') {
    clearInterval(waitForConfigs);

    global.helper = require("./utils/helper.js");
    global.Request = require("./models/request.js");
    global.Item = require("./models/item.js");

  } else if (i >= 1000) {
    throw "Config load timed out";
  }
  i++;
}, 200);
