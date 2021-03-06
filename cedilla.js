
"use strict";

var CONFIGS = require("./lib/config.js");
var npid = require('npid');
var log = require('./lib/logger.js');
var helper = require("./lib/utils/helper.js");
var online = false;

try {
  var pid = npid.create(process.cwd() + '/cedilla.pid', true);
  pid.removeOnExit();
} catch (err) {
  console.log('Unable to create the PID file, ./cedilla.pid! ' + err);
}

try {
  // Stub service implementation only available when the application.yaml contains the serve_default_content parameter
  // this is needed when running without any real services, such as when testing
  var defaultService, defaultServiceRunning = false;

  if (CONFIGS.application.default_content_service && !defaultServiceRunning) {
    log.info({object: 'cedilla.js'}, 'Starting default service.');

    defaultService = require('./lib/utils/default_service');

    defaultService.startDefaultService(CONFIGS.application.default_content_service_port);
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

module.exports = exports = {
  isOnline: function() {
    return online;
  }
};

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
