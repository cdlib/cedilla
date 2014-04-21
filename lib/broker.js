var Dispatcher = require('./dispatcher.js'),
		Service = require('./service.js'),
		Tier = require('./tier.js'),
		_ = require('underscore'),
		configManager = require('../config/config.js');

/* -----------------------------------------------------------------------------------------------
 * BROKER
 * ----------------------------------------------------------------------------------------------- 
 */
var messages = undefined,
		rulesConfig = undefined,
		svcConfig = undefined;

console.log('loading broker');
configManager.getConfig('message', function(config){ messages = config; });
configManager.getConfig('services', function(config){ svcConfig = config['services']['tiers']; });
configManager.getConfig('rules', function(config){ rulesConfig = config['objects']; });

var Broker = function() {
	// -----------------------------------------------------------------------------------------------
	this.negotiate = function(socket, item){
		// Get the available services for the genre and content_type specified by the client
		var services = getAvailableServices(item);
		
		// TODO: Filter the list of services if the client specified a specific list
		services = filterServiceList(services, item);
		
		// If the item is valid and we have services we can dispatch to
		if(item.isValid() && _.size(services) > 0){
			// Organize the services into Tiers
			var tiers = prepareTiers(services);

			// Send the negotiated services to the dispatcher
			var dispatcher = new Dispatcher();
			
			dispatcher.process(socket, tiers, item, function(){
				socket.emit('complete', messages['broker_response_success']);
			});
			
		}else{
			if(item.isValid()){
				socket.emit('error', messages['broker_no_services_available']);
			}else{
				socket.emit('error', messages['broker_bad_item_message']);
			}
		}
	};

	// -----------------------------------------------------------------------------------------------
	function getAvailableServices(item){
	  // Grab the list of services available for the item's rules
	  var ret = []
		
		_.forEach(rulesConfig[item.getType()], function(values, attribute){
			var itemValue = item.getAttribute(attribute);
			var services = [];
			
			// If the item has the attribute find the services available for its value, if
			// the item does NOT have the attribute then it shouldn't be able to dispatch to 
			// ANY services so let the filter step below clear everything out!
			if(typeof itemValue != 'undefined'){
				_.forEach(values[itemValue], function(service){
					
					var config = undefined;
					// Locate the service's config in the services.yaml
					_.forEach(svcConfig, function(services, tier){
						if(typeof svcConfig[tier.toString()][service] != 'undefined'){
							config = svcConfig[tier.toString()][service];
						}
					})
					if(typeof config != 'undefined'){
						services.push(new Service(service, config));
					}
				});
			}
			
			// Only keep the ones that are present in the prior checks unless this is the first check!
			if(_.size(ret) > 0){
				ret = ret.filter(function(svc){ return _.find(services, function(item){ return item.getName() == svc.getName(); }); });
			}else{
				ret = services;
			}
		});
		
	  return ret
	};

	// -----------------------------------------------------------------------------------------------
	function filterServiceList(services, clientList){
		// TODO: This is the spot where we will filter out the services based on the list the client passed in
		return services;
	};
	
	// -----------------------------------------------------------------------------------------------
	function prepareTiers(services){
		var ret = [];
		
		// Loop through the tiers defined in the config
		_.forEach(svcConfig, function(config, tier){
			var svcs = [];
			
			_.forEach(config, function(values, key){
				
				var item = _.find(services, function(svc){ return svc.getName() == key; }); 
				if(typeof item != 'undefined'){
					svcs.push(item);
				}
			});
			
			// If there were any available services in the tier create the Tier object
			if(_.size(svcs) > 0){
				console.log('.. building out tier ' + tier + ' -- ' + svcs);
				
				ret.push(new Tier(tier, svcs));
			}
		});	
		
		return ret;
	};
}

module.exports = Broker;
