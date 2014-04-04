var Dispatcher = require('./dispatcher.js'),
		_ = require('underscore');

/* -----------------------------------------------------------------------------------------------
 * BROKER
 * ----------------------------------------------------------------------------------------------- 
 */
var Broker = function() {
	// -----------------------------------------------------------------------------------------------
	this.negotiate = function(socket, configManager, citation){
		// Get the available services for the genre and content_type specified by the client
		var services = getAvailableServices(configManager, citation);
		
		// TODO: Filter the list of services if the client specified a specific list
		services = filterServiceList(services, citation);
		
		// If the citation is valid and we have services we can dispatch to
		if(citation.isValid() && _.size(services) > 0){
			// Send the negotiated services to the dispatcher
			var dispatcher = new Dispatcher();
			
			dispatcher.process(socket, configManager, services, citation, function(){
				socket.emit('complete', configManager.getConfig('application')['broker_response_success']);
			});
		}
	};

	// -----------------------------------------------------------------------------------------------
	function getAvailableServices(configManager, citation){
	  // Grab the list of services available for the citation's genre and content type
	  var ret = []
		var rulesConfig = configManager.getConfig('rules');
		
		// Get all of the services that provide for the specified genre
		if(typeof rulesConfig['genres'][citation.getGenre()] != 'undefined'){
			ret = rulesConfig['genres'][citation.getGenre()];
		}
		
		// Get all of the services that support the specified content_type
		if(typeof rulesConfig['content_types'][citation.getContentType()] != 'undefined'){
			var svcs = rulesConfig['content_types'][citation.getContentType()];
		
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
