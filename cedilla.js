require('./init.js');

var online = false;

module.exports = {
	isOnline: function(){ return online; }
}

// Wait for the config file and init.js have finished loading before starting up the server
var delayStartup = setInterval(function(){
  if(typeof helper != 'undefined'){
    clearInterval(delayStartup);

    try{
      // Stub service implementation only available when the application.yaml contains the serve_default_content parameter
      var defaultService = undefined,
          defaultServiceRunning = false;
        
      if(CONFIGS['application']['default_content_service'] && !defaultServiceRunning){
        log.info({object: 'cedilla.js'}, 'Starting default service.');
        
        defaultService = require('./lib/utils/default_service');

        defaultService.startDefaultService(CONFIGS['application']['default_content_service_port']);
        defaultServiceRunning = true;
      }
    
      var server = require('./lib/server.js');

      // Bind to the port specified in the config/application.yaml or the default 3000
      // ----------------------------------------------------------------------------------------------
      server.listen((CONFIGS['application']['port'] || 3000), function(){
        var msg = CONFIGS['application']['application_name'] + ' is now monitoring port ' + CONFIGS['application']['port'];

        console.log(msg);
        log.info({object: 'server.js'}, msg);
        
        online = true
      });
  
      // Terminate the default service
      server.on('close', function(){
        log.info({object: 'cedilla.js'}, 'Shutting down web server.');
        stopDefaultService();
        online = false
      });
      
      // Capture any server errors and log it. Shut down the default service if its running
      server.on('error', function(err){
        log.error({object: 'cedilla.js'}, err);        
        stopDefaultService();
      });
      
      
      var stopDefaultService = function(){
        // Stop the stub service if its running
        if(defaultServiceRunning){
          log.info({object: 'cedilla.js'}, 'Shutting down default service.');
          
          defaultService.close();
          defaultServiceRunning = false;
        }
      };
    
    }catch(e){
      log.error({object: 'cedilla.js'}, e);
    }
  }
});

// -----------------------------------------------------------------------------------------
process.on('uncaughtException', function(err){
  var msg = 'Node experienced an unhandled exception! Terminating the cedilla delivery aggregator: ' + err.message;
  
  // Write out to the console incase the issue lies with the logger itself.
  console.log(msg);
  console.log(err.stack);
  
  log.error({object: 'cedilla.js'}, err);
  
  helper.contactAllNotifiers(msg, function(resp){
    helper.contactAllNotifiers(err.stack, function(resp){});
  });
  
  isOnline = false
  
  process.exit(1);
});
