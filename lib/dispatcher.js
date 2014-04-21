var Tier = require('./tier.js'),
		_ = require('underscore'),
		configManager = require('../config/config.js');

/* -----------------------------------------------------------------------------------------------
 * DISPATCHER
 * ----------------------------------------------------------------------------------------------- 
 */

var messages = undefined;

console.log('loading dispatcher')
configManager.getConfig('message', function(config){ messages = config; }); 

var Dispatcher = function() {
	// -----------------------------------------------------------------------------------------------
	this.process = function(socket, tiers, item, callback){
		// Group the negotiated services into their tiers
		//var tiers = prepareTiers(configManager, availableServices);
		
		if(_.size(tiers) > 0){
			// Sort the tiers so that we process them in order!
			tiers = _.sortBy(tiers, function(item){ return item.getName() });
			
			// Process the tiers synchronously	
			traverseNextTier(socket, item, [], tiers, 0, function(){
				console.log('.. all tiers have finished processing');
				callback();
			});
		}
	}

	// -----------------------------------------------------------------------------------------------
	function traverseNextTier(socket, item, additionalServices, tiers, index, callback){
		if(tiers[index]){
			console.log('.. processing tier ' + tiers[index].getName());
			
			processTier(socket, item, additionalServices, tiers[index], function(finalItem, servicesOnHold){
				
				console.log('.. new citation -> ' + finalItem.toString());
				
				// Kick off the next tier
				return traverseNextTier(socket, finalItem, servicesOnHold, tiers, (index + 1), callback);
			});
	
		} else {
			console.log('.. finished processing tiers');
			callback();
		}
	};
	
	// -----------------------------------------------------------------------------------------------
	function processTier(socket, item, additionalServices, tier, callback){
		setTimeout(function(){ 
			if(!_.isEmpty(additionalServices)){
				tier.addServices(additionalServices);
			}
			tier.negotiate(socket, item, callback); 
		});
	};

}

module.exports = Dispatcher;