require('./init.js');

// Wait for the config file and init.js have finished loading before starting up the server
var delayStartup = setInterval(function(){
  if(typeof helper != 'undefined'){
    clearInterval(delayStartup);

    // Stub service implementation only available when the application.yaml contains the serve_default_content parameter
		var defaultService = undefined,
        defaultServiceRunning = false;
				
    if(CONFIGS['application']['default_content_service'] && !defaultServiceRunning){
      defaultService = require('./lib/utils/default_service');

      defaultService.startDefaultService(CONFIGS['application']['default_content_service_port']);
      defaultServiceRunning = true;
    }

		var server = require('./lib/server.js');
		
		server.on('close', function(){
		  // Stop the stub service if its running
		  if(defaultServiceRunning){
		    defaultService.close();
		    defaultServiceRunning = false;
		  }
		});
	}
});

