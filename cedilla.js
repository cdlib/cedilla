
"use strict";

require("./lib");

var CONFIGS = require("./lib/config.js");
var npid = require('npid');
var online = false;

// Setup a timer to wait for the CONFIGS to get loaded before loading
// modules that depend on CONFIGS
// fs operations in config may be causing this problem?
var i = 0;
var log;
var helper;

var waitForConfigs = setInterval(function() {
  if (typeof CONFIGS.application !== 'undefined' || i >= 2000) {
    clearInterval(waitForConfigs);
    log = require('./lib/logger.js');
    helper = require("./lib/utils/helper.js");
  }
  i++;
}, 200);

try {
  var pid = npid.create(process.cwd() + '/cedilla.pid', true);
  pid.removeOnExit();
} catch (err) {
  console.log('Unable to create the PID file, ./cedilla.pid! ' + err);
}

module.exports = exports = {
  isOnline: function() {
    return online;
  }
};

// Wait for the config file and other modules have finished loading before starting up the server
var delayStartup = setInterval(function() {
  if (typeof helper !== 'undefined') {
    clearInterval(delayStartup);

    try {
      // Stub service implementation only available when the application.yaml contains the serve_default_content parameter
      var defaultService, defaultServiceRunning = false;

      if (CONFIGS.application.default_content_service && !defaultServiceRunning) {
        log.info({object: 'cedilla.js'}, 'Starting default service.');

        defaultService = require('./lib/utils/default_service');

        defaultService.startDefaultService(CONFIGS.application.efault_content_service_port);
        defaultServiceRunning = true;
      }

      var server = require('./lib/server.js');

      var port = process.env.NODE_PORT;

      if (typeof port === 'undefined' || port === '') {
        port = (CONFIGS.application.port || 3000);
      }

      // Bind to the port specified in the config/application.yaml or the default 3000
      server.listen(port, function() {
        var msg = CONFIGS.application.application_name + ' is now monitoring port ' + port;

        console.log(msg);
        log.info({object: 'server.js'}, msg);

        online = true;
      });

      // Terminate the default service
      server.on('close', function() {
        log.info({object: 'cedilla.js'}, 'Shutting down web server.');
        stopDefaultService();
        online = false;
      });

      // Capture any server errors and log it. Shut down the default service if its running
      server.on('error', function(err) {
        log.error({object: 'cedilla.js'}, err);
        stopDefaultService();
      });


      var stopDefaultService = function() {
        // Stop the stub service if its running
        if (defaultServiceRunning) {
          log.info({object: 'cedilla.js'}, 'Shutting down default service.');

          defaultService.close();
          defaultServiceRunning = false;
        }
      };

    } catch (e) {
      log.error({object: 'cedilla.js'}, e);
    }
  }
});

// -----------------------------------------------------------------------------------------
process.on('uncaughtException', function(err) {
  var msg = 'Node experienced an unhandled exception! Terminating the cedilla delivery aggregator: ' + err.message;

  // Write out to the console in case the issue lies with the logger itself.
  console.log(msg);
  console.log(err.stack);

  log.error({object: 'cedilla.js'}, err);

  helper.contactAllNotifiers(msg, function(resp) {
    console.log('Contacting all notifiers with ' + JSON.stringify(resp));
    helper.contactAllNotifiers(err.stack, function(resp) {
      console.log('Contacting all notifiers with ' + JSON.stringify(resp));
    });
  });

  online = false;
  process.exit(1);
});
