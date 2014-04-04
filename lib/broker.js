var Dispatcher = require('./dispatcher.js'),
		_ = require('underscore');

/* -----------------------------------------------------------------------------------------------
 * BROKER
 * ----------------------------------------------------------------------------------------------- 
 */
var Broker = function() {
	// -----------------------------------------------------------------------------------------------
	this.negotiate = function(socket, openUrl, appConfig, servicesConfig, rulesConfig){
		
		// Terminate if any of the configuration files is undefined!
		if(typeof appConfig != 'undefined' && typeof servicesConfig != 'undefined' && typeof rulesConfig != 'undefined'){
			
			// Get the available services for the genre and content_type specified by the client
			var services = getAvailableServices(rulesConfig, openUrl);
		
			// TODO: Filter the list of services if the client specified a specific list
			services = filterServiceList(services, openUrl);
		
			// Send the negotiated services to the dispatcher
			var dispatcher = new Dispatcher();
			
			dispatcher.process(socket, servicesConfig, services, function(){
				socket.emit('complete', appConfig['broker_response_success']);
			});
			
		}else{
			console.log('BROKER: One of the configuration files was missing! - terminating request');
		}
	};

	// -----------------------------------------------------------------------------------------------
	function getAvailableServices(rulesConfig, citation){
	  // Grab the list of services available for the citation's genre and content type
	  var ret = []
	
		// Get all of the services that provide for the specified genre
		if(typeof rulesConfig['genres']['journal'] != 'undefined'){
			ret = rulesConfig['genres']['journal'];
		}
		
		// Get all of the services that support the specified content_type
		if(typeof rulesConfig['content_types']['full_text'] != 'undefined'){
			var svcs = rulesConfig['content_types']['full_text'];
		
			// Only keep the ones that are present in the genre scan
			ret = ret.filter(function(item){
				return svcs.indexOf(item) >= 0;
			});
		}
		
	  return ret
	};

	// -----------------------------------------------------------------------------------------------
	function filterServiceList(services, clientList){
		return services;
	};
}

module.exports = Broker;
