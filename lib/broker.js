/* -----------------------------------------------------------------------------------------------
 * BROKER: The broker receives the incoming item sent from the client and determines which services
 *         are available to fulfill the request. It then groups the services into tiers and then
 *         processes each tier synchronously.
 * ----------------------------------------------------------------------------------------------- 
 */
var Broker = function(socket, request) {
  var self = this;
  
  self._socket = socket;
  self._request = request;
  
  if(request){
    if(typeof socket != 'undefined' && request.hasReferents()){
      // Call the constructor for EventEmitter
      events.EventEmitter.call(self);
  
      self._tiers = [];

      //Setup event handlers for each item type
      _.forEach(CONFIGS['data']['objects'], function(def, type){ 
        self.on(type, function(item){ socket.emit(type, item + '\n'); });
      });
    
    }else{
      if(typeof socket == 'undefined'){
        LOGGER.log('fatal', CONFIGS['message']['broker_bad_socket']);
        request.setEndTime(new Date());
        
        throw new Error(CONFIGS['message']['broker_bad_socket']);
        
      }else{
        LOGGER.log('warn', CONFIGS['message']['broker_bad_item_message'] + ' :: ' + request.getId());
        
        request.setEndTime(new Date());
        request.addError(CONFIGS['message']['broker_bad_item_message']);
        
        socket.emit('complete', CONFIGS['message']['broker_bad_item_message']);
      }
    }
    
  }else{
    LOGGER.log('fatal', CONFIGS['message']['broker_bad_request']);
    throw new Error(CONFIGS['message']['broker_bad_request']);
  }
};
    
// -----------------------------------------------------------------------------------------------
util.inherits(Broker, events.EventEmitter);

// -----------------------------------------------------------------------------------------------
Broker.prototype.processRequest = function(referent){      
  var self = this;
  
  // Get the available services for the genre and content_type specified by the client
  self._services = self._getAvailableServices(referent);

  self._services = self._addAlwaysRunServices(self._services);

  // TODO: Filter the list of services if the client specified a specific list
  _services = self._filterServicesForClientList(self._services, referent);

  // Attach request information to the service so it can be transmitted to the service endpoints
  _.forEach(self._services, function(service){
    service.setRequestInformation({"api_ver": self._request.getServiceApiVersion(),
                                    "referrers": self._request.getReferrers(),
                                    "requestor_affiliation": self._request.getRequestor().getAffiliation(),
                                    "requestor_ip": self._request.getRequestor().getIp(),
                                    "requestor_language": self._request.getRequestor().getLanguage(),
                                    "unmapped": self._request.getUnmapped(),
                                    "original_request": self._request.getRequest()});
  });

  // If the item is valid and we have services we can dispatch to
  if(referent.isValid()){
    // Organize the services into Tiers
    self._prepareTiers(self._services, self._request.getReferrers());

    if(_.size(self._tiers) > 0){
      // Process the tiers synchronously  
      self._processTier(self._socket.handshake.headers, 0, referent, function(){
        LOGGER.log('info', 'All tiers have finished processing :: ' + self._request.getId());
    
        self._request.setEndTime(new Date());
        LOGGER.log('info', serializer.requestToJson(self._request));

        //Send the complete message to the client after all tiers have processed
        self._socket.emit('complete', CONFIGS['message']['broker_response_success']);
      });

    }else{
      // No services are available for the requested item!
      LOGGER.log('info', CONFIGS['message']['broker_no_services_available'] + ' :: ' + self._request.getId());
  
      self._request.setEndTime(new Date());
      self._request.addError(CONFIGS['message']['broker_no_services_available']);

      LOGGER.log('info', serializer.requestToJson(self._request));

      self._socket.emit('complete', CONFIGS['message']['broker_no_services_available']);
    }

  }else{
    // The item was not valid!
    LOGGER.log('warn', CONFIGS['message']['broker_bad_item_message'] + ' :: ' + self._request.getId());

    self._request.setEndTime(new Date());
    self._request.addError(CONFIGS['message']['broker_bad_item_message']);

    LOGGER.log('info', serializer.requestToJson(self._request));

    self._socket.emit('complete', CONFIGS['message']['broker_bad_item_message']);
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
          // Do not add the tier if it has been disabled!
          if(config['enabled']){
            services.push(new Service(service));
          }
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
  
  var existing = [],
      defined = [];   
  
  // Cololect the names of the services already in the queue
  _.forEach(services, function(service){
    existing.push(service.getName());
  });
  
  _.forEach(CONFIGS['services']['tiers'], function(svcs, tier){
    _.forEach(svcs, function(def, svc){
      if(def['enabled']){
        defined.push(svc);
      }
    });
  });
  
  // Add ANY services listed in dispatch_always UNLESS the service is already there!
  _.forEach(CONFIGS['rules']['dispatch_always'], function(service){
    if(!_.contains(existing, service) && _.contains(defined, service)){
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
Broker.prototype._removeServiceForReferer = function(tierName, serviceName, referrers){
  var ret = false;

  if(typeof referrers != 'undefined'){

    _.forEach(referrers, function(referrer){
      if(referrer){
        // Loop through the referer restrictions if there are any
        if(typeof CONFIGS['services']['tiers'][tierName][serviceName]['do_not_call_if_referrer_from'] != 'undefined'){
          _.forEach(CONFIGS['services']['tiers'][tierName][serviceName]['do_not_call_if_referrer_from'], function(domain){
            if(referrer.toString().indexOf(domain) >= 0){
              LOGGER.log('debug', 'Removing ' + serviceName + ' because the referer,' + referrer + ', is from ' + domain);
              ret = true;
            }
          });
    
        }
      }
    });
  }
  
  return ret;
};

// -----------------------------------------------------------------------------------------------
Broker.prototype._prepareTiers = function(services, referrers){
  var self = this,
      tiers = [];
  
  _.forEach(CONFIGS['services']['tiers'], function(config, tier){
    var svcs = [];
   
    _.forEach(config, function(values, key){
      var foundSvc = _.find(services, function(svc){ return svc.getName() == key; }); 
      
      if(typeof foundSvc != 'undefined'){  
        // If the service should not be run for the referer then do not add it to the tier!
        if(!self._removeServiceForReferer(tier, foundSvc.getName(), referrers)){
          svcs.push(foundSvc);
        }
      }
    });
    
    // If services were available for the service add them to the tier and add the tier to the collection
    if(_.size(svcs) > 0){
      var newTier = new Tier(tier);

      newTier.emit('register', svcs);
      
      tiers.push(newTier);
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
        // Send out the child items as separate responses to the client
        self._sendItemToClient(service, newItem);
        
      }else{
        self.emit('error', serializer.itemToJsonForClient('Cedilla', new Item('error', false, 
                                                          {'level':'warning', 
                                                           'message': CONFIGS['message']['tier_unknown_item_type']})));
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
Broker.prototype._sendItemToClient = function(service, item){
  var self = this,
        svc = undefined;

  // Get the current service
  _.forEach(self._services, function(serv){
    if(serv.getDisplayName() == service){ 
      svc = serv;
    }
  })

  if(item instanceof Item){
    _.forEach(CONFIGS['data']['objects'][item.getType()]['children'], function(child){

      _.forEach(item.getAttribute(child + 's'), function(kid){
        self._sendItemToClient(service, kid);
      });
    
      item.removeAttribute(child + 's');
    });
  
    if(_.size(item.getAttributes()) > 0){
    
      // If the service is allowed to send back the current item type 
      if(svc.returnsItemType(item.getType())){
        self.emit(item.getType(), serializer.itemToJsonForClient(service, item));
      }
    }
  }
};

// -----------------------------------------------------------------------------------------------
module.exports = Broker;
