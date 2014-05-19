/* -----------------------------------------------------------------------------------------------
 * BROKER: The broker receives the incoming item sent from the client and determines which services
 *         are available to fulfill the request. It then groups the services into tiers and then
 *         processes each tier synchronously.
 * ----------------------------------------------------------------------------------------------- 
 */
var Broker = function(socket, item) {
  var self = this;
  var _tiers = [];
  
  // Get the available services for the genre and content_type specified by the client
  var services = self._getAvailableServices(item);
  
	service = self._addAlwaysRunServices(services);
	
  // TODO: Filter the list of services if the client specified a specific list
  services = self._filterServicesForClientList(services, item);
  
	
  // If the item is valid and we have services we can dispatch to
  if(item.isValid() && _.size(services) > 0){
    // Organize the services into Tiers
    var tiers = self._prepareTiers(socket, services);
    
    if(_.size(tiers) > 0){
      // Sort the tiers so that we process them in order!
      self._tiers = _.sortBy(tiers, function(item){ return item.getName() });
      
      // Process the tiers synchronously  
      self._processTier(socket, item, [], 0, function(){
        LOGGER.log('debug', 'All tiers have finished processing :: ' + item.toString());
        
        //Send the complete message to the client after all tiers have processed
        socket.emit('complete', CONFIGS['message']['broker_response_success']);
      });
      
    }else{
      LOGGER.LOG('debug', CONFIGS['message']['broker_no_services_available'] + ' :: ' + item.toString());
      
      socket.emit('error', CONFIGS['message']['broker_no_services_available']);
    }

  }else{
    if(item.isValid()){
      LOGGER.log('debug', CONFIGS['message']['broker_no_services_available'] + ' :: ' + item.toString());
      
      socket.emit('error', CONFIGS['message']['broker_no_services_available']);
    }else{
      LOGGER.log('warn', CONFIGS['message']['broker_bad_item_message'] + ' :: ' + item.toString());
      
      socket.emit('error', CONFIGS['message']['broker_bad_item_message']);
    }
  }
  
};

// -----------------------------------------------------------------------------------------------
Broker.prototype._getAvailableServices = function(item){
  // Grab the list of services available for the item's rules
  var ret = []
  
  _.forEach(CONFIGS['rules']['objects'][item.getType()], function(values, attribute){
    var itemValue = item.getAttribute(attribute);
    var services = [];
    
    // If the item has the attribute find the services available for its value, if
    // the item does NOT have the attribute then it shouldn't be able to dispatch to 
    // ANY services so let the filter step below clear everything out!
    if(typeof itemValue != 'undefined'){
      _.forEach(values[itemValue], function(service){
        
        var config = undefined;
        // Locate the service's config in the services.yaml
        _.forEach(CONFIGS['services']['tiers'], function(services, tier){
          if(typeof CONFIGS['services']['tiers'][tier.toString()][service] != 'undefined'){
            config = CONFIGS['services']['tiers'][tier.toString()][service];
          }
        })
        if(typeof config != 'undefined'){
          services.push(new Service(service));
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
Broker.prototype._addAlwaysRunServices = function(services){
	var ret = services;
	
	var existing = [];
	
	// Cololect the names of the services already in the queue
	_.forEach(services, function(service){
		existing.push(service.getName());
	});
	
	// Add ANY services listed in dispatch_always UNLESS the service is already there!
	_.forEach(CONFIGS['rules']['dispatch_always'], function(service){
		if(!_.contains(existing, service)){
			ret.push(new Service(service));
		}
	});
	
	return ret;
};

// -----------------------------------------------------------------------------------------------
Broker.prototype._filterServicesForClientList = function(services, clientList){
  // TODO: This is the spot where we will filter out the services based on the list the client passed in
  return services;
};

// -----------------------------------------------------------------------------------------------
Broker.prototype._removeServiceForReferer = function(tierName, serviceName, referer){
	var ret = false;
	
	// Loop through the referer restrictions if there are any
	if(typeof CONFIGS['services']['tiers'][tierName][serviceName]['do_not_call_if_referrer_from'] != 'undefined'){
		
		_.forEach(CONFIGS['services']['tiers'][tierName][serviceName]['do_not_call_if_referrer_from'], function(domain){
			if(referer.indexOf(domain) >= 0){
				LOGGER.log('debug', 'Removing ' + serviceName + ' because the referer,' + referer + ', is from ' + domain);
				ret = true;
			}
		});
		
	}
	
  return ret;
};

// -----------------------------------------------------------------------------------------------
Broker.prototype._prepareTiers = function(socket, services){
  var ret = [],
			self = this;
  
  // Loop through the tiers defined in the config
  _.forEach(CONFIGS['services']['tiers'], function(config, tier){
    var svcs = [];
    
    _.forEach(config, function(values, key){
      
      var item = _.find(services, function(svc){ return svc.getName() == key; }); 
      if(typeof item != 'undefined'){
				
				// If the service should not be run for the referer then do not add it to the tier!
				if(!self._removeServiceForReferer(tier, item.getName(), socket.handshake.headers['referer'])){
        	svcs.push(item);
				}
      }
    });
    
    // If there were any available services in the tier create the Tier object
    if(_.size(svcs) > 0){
      LOGGER.log('debug', 'Building out tier ' + tier + ' -- ' + svcs);
      
      ret.push(new Tier(tier, svcs));
    }
  });  
  
  return ret;
};

// -----------------------------------------------------------------------------------------------
Broker.prototype._processTier = function(socket, item, additionalServices, index, callback){
  var self = this;
  
  if(self._tiers[index]){
    LOGGER.log('debug', 'Processing tier ' + self._tiers[index].getName());
    
    self._tiers[index].negotiate(socket, item, function(augmentedItem, leftoverServices){
      
      // If there were leftover services and there are other tiers, add the services to the next tier
      if(!_.isEmpty(leftoverServices) && self._tiers[index + 1] instanceof Tier){
        self._tiers[index + 1].addServices(leftoverServices);
      }
      
      return self._processTier(socket, augmentedItem, leftoverServices, (index + 1), callback);
    });
    
  } else {
    LOGGER.log('debug', 'Finished processing tiers');
    callback();
  }
};


// -----------------------------------------------------------------------------------------------
module.exports = Broker;
