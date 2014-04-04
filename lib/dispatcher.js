var Tier = require('./tier.js'),
		_ = require('underscore');

/* -----------------------------------------------------------------------------------------------
 * DISPATCHER
 * ----------------------------------------------------------------------------------------------- 
 */
var Dispatcher = function() {
	// -----------------------------------------------------------------------------------------------
	this.process = function(socket, configManager, availableServices, callback){
		// Group the negotiated services into their tiers
		var tiers = prepareTiers(configManager, availableServices);
		
		if(_.size(tiers) > 0){
			// Sort the tiers so that we process them in order!
			tiers = _.sortBy(tiers, function(item){ return item.getName() });
			
			// Process the tiers synchronously	
			traverseNextTier(socket, tiers, 0, function(){
				console.log('.. all tiers have finished processing');
				callback();
			});
		}
	}
	
	// -----------------------------------------------------------------------------------------------
	function prepareTiers(configManager, availableServices){
		var tiers = [];
		var servicesConfig = configManager.getConfig('services');
		var tierNames = servicesConfig['services']['tiers'];
		
		// Loop through the tiers defined in the config
		_.each(tierNames, function(config, name){
			var svcs = [];
			
			// Only retain the services in the tier that match the ones available based on the checks above
			_.each(servicesConfig['services']['tiers']['' + name], function(config, svc){
				if(_.findWhere(availableServices, svc) != 'undefined'){
					svcs.push([svc, config]);
				}
			});
		
			// If there were any available services in the tier create the Tier object
			if(_.size(svcs) > 0){
				console.log('.. configuring tier ' + name + ' -- ' + svcs);
				
				tiers.push(new Tier(name, configManager, svcs));
			}
		});	
		
		return tiers;
	};

	// -----------------------------------------------------------------------------------------------
	function traverseNextTier(socket, tiers, index, callback){
		if(tiers[index]){
			console.log('.. processing tier ' + tiers[index].getName());
			
			processTier(socket, tiers[index], function(result){
				// Kick off the next tier
				return traverseNextTier(socket, tiers, (index + 1), callback);
			});
	
		} else {
			console.log('.. finished processing tiers');
			callback();
		}
	};
	
	// -----------------------------------------------------------------------------------------------
	function processTier(socket, tier, callback){
		setTimeout(function(){ 
			tier.negotiate(socket, callback); 
		});
	};

}

module.exports = Dispatcher;