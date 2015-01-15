
// In a couple of places modules fail to load properly,
// at least without producing side effects, possibly due to obscure (transient) circular dependencies
// For these cases it works to export the module to a global variable
// This workaround should be removed if the root cause of this can be determined
"use strict";

// namespace for application
global.cdla = {};

var CONFIGS = require("./config.js");

var i = 0;

// the reason for the need to wait is obscure
// as require is supposed to be synchronous
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
