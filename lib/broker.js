var util = require('util'),
    events = require('events');
    
/* -----------------------------------------------------------------------------------------------
 * BROKER: The broker receives the incoming item sent from the client and determines which services
 *         are available to fulfill the request. It then groups the services into tiers and then
 *         processes each tier synchronously.
 * ----------------------------------------------------------------------------------------------- 
 */
var Broker = function(socket, item) {
  var self = this;
  
  // Call the constructor for EventEmitter
  events.EventEmitter.call(self);
  
  self._tiers = [];
  
  // Get the available services for the genre and content_type specified by the client
  var services = self._getAvailableServices(item);
  
  service = self._addAlwaysRunServices(services);
  
  // TODO: Filter the list of services if the client specified a specific list
  services = self._filterServicesForClientList(services, item);
  
  
  // If the item is valid and we have services we can dispatch to
  if(item.isValid()){
    // Organize the services into Tiers
    self._prepareTiers(services, socket.handshake.headers['referer']);

    if(_.size(self._tiers) > 0){

      // Process the tiers synchronously  
      self._processTier(socket.handshake.headers, 0, item, function(){
        LOGGER.log('debug', 'All tiers have finished processing :: ' + item.toString());
        
        //Send the complete message to the client after all tiers have processed
        socket.emit('complete', CONFIGS['message']['broker_response_success']);
      });
      
    }else{
      LOGGER.log('debug', CONFIGS['message']['broker_no_services_available'] + ' :: ' + item.toString());
      
      self.emit('error', CONFIGS['message']['broker_no_services_available']);
    }

  }else{
    LOGGER.log('warn', CONFIGS['message']['broker_bad_item_message'] + ' :: ' + item.toString());
      
    self.emit('error', CONFIGS['message']['broker_bad_item_message']);
  }
  
  _.forEach(CONFIGS['data']['objects'], function(def, type){ 
    self.on(type, function(item){ socket.emit(type, item + '\n'); });
  });
  
};

// -----------------------------------------------------------------------------------------------
util.inherits(Broker, events.EventEmitter);

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
Broker.prototype._prepareTiers = function(services, referer){
  var self = this,
      tiers = [];
  
  _.forEach(CONFIGS['services']['tiers'], function(config, tier){
    var svcs = [];
    
    _.forEach(config, function(values, key){
      var item = _.find(services, function(svc){ return svc.getName() == key; }); 
      
      if(typeof item != 'undefined'){  
        // If the service should not be run for the referer then do not add it to the tier!
        if(!self._removeServiceForReferer(tier, item.getName(), referer)){
          svcs.push(item);
        }
      }
    });
    
    // If services were available for the service add them to the tier and add the tier to the collection
    if(_.size(svcs) > 0){
      var tier = new Tier(tier);
      tier.emit('register', svcs);
      
      tiers.push(tier);
    }
  });
  
  // If any tiers were defined, sort them by name
  if(_.size(tiers) > 0){
    self._tiers = _.sortBy(tiers, function(item){ return item.getName() });
  }
};

// -----------------------------------------------------------------------------------------------
Broker.prototype._processTier = function(headers, index, item, callback){
  var self = this,
      _complete = false;

  if(self._tiers[index] instanceof Tier){
    var tier = self._tiers[index];
    
    // ----------------------------------------
    var heartbeat = setInterval(function(){
      if(_complete){
        clearInterval(heartbeat);

        self._processTier(headers, (index + 1), item, callback);
      }        
    }, 500);
  
    // ----------------------------------------
    tier.on('message', function(result){
      var service = result['service'];
      var newItem = result['item'];
      
      if((typeof service != 'undefined') && (newItem instanceof Item)){
        self.emit(newItem.getType(), serializer.itemToJsonForClient(service, newItem));
        
      }else{
        LOGGER.log('warning', 'Unable to process the result!');
        LOGGER.log('warning', '.. service: ' + service);
        LOGGER.log('warning', '.. item: ' + newItem);
        
        self.emit('error', serializer.itemToJsonForClient('Cedilla', new Item('error', false, {'level':'warning', 
                                                                                  'message': 'Unable to process the result!'})));
      }
        
    });
  
    // ----------------------------------------
    tier.on('complete', function(leftovers){
      if(_.size(leftovers) > 0){
        
        // If the current tier had any services that were placed on hold, register them with the next Tier.
        if(self._tiers[index + 1] instanceof Tier){
          self._tiers[index + 1].emit('register', leftovers);
        }
      }
      
      _complete = true;
    });
  
    // ----------------------------------------
    tier.process(headers, item);
    
  }else{
    // We processed the final tier so call the callback
    callback();
  }
};


// -----------------------------------------------------------------------------------------------
module.exports = Broker;
