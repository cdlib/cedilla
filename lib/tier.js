var Encoder = require('node-html-encoder').Encoder,
		util = require('util'),
		events = require('events');

/* -----------------------------------------------------------------------------------------------
 * TIER: The tier represents a grouping of services that should be run together. It passes the item
 *       passed in from the client and processes the service's response  to determine what information
 *       to pass back to the client.
 *
 * Tiers are defined in the config/service.yaml file along with their associated services. The tiers
 * are loaded and initialized in the broker.js file and are called in synchronously. Once all of the
 * current tier's services have finished processing the next tier is invoked. The tiers are run in
 * order sorted by their names.
 *
 * The tier checks the config/rules.yaml file to determine if a service can be called based on the 
 * attributes of the item passed in.
 *
 * As each service responds, the tier examines the rules for the service to determine what items in
 * the response can be sent back to the client via its socket.io connection. 
 * ----------------------------------------------------------------------------------------------- 
 */
var Tier = function(name) {
	// Call the constructor for EventEmitter
	events.EventEmitter.call(this);
	
	this._name = helper.safeAssign('string', name, 'tier_?');
  
  this._complete = 0;
//  this._holding = 0;
//  this._total = -1;
  
  this._holdingQueue = [];
	
	this._queue = [];
	
//  this._registeredCallback = undefined;

  // Load the services
/*  if(services instanceof Array){
    this._services = services;
  
    this._total = _.size(this._services);
    
  }else{
    throw new Error(helper.buildMessage(CONFIGS['message']['tier_services_not_array'], [name]));
  }*/


	// ----------------------------------------------------------------------------
	this.on('register', function(services){
	  var self = this;
  
	  _.forEach(services, function(service){ 
		  self._queue.push(service);
	  });
	});

	
	// ----------------------------------------------------------------------------
	this.on('response', function(params){
		
		if(params['new'] instanceof Array){
			
			if(params['original'] instanceof Item){
			
				// Send out each item individually
				_.forEach(params['new'], function(item){
					this.emit('success', item);
				});
			
			}else{
				// The original item is somehow undefined!
				this.emit('error', [new Item('error', true, {'message': CONFIGS['message']['tier_no_original_item']})]);
			}
				
		}else{
			if(params['new'] instanceof Item){
				// Its an error so just pass it along
				this.emit('error', params['new']);

			}else{
				// Otherwise this is an unknown item so throw an error
				this.emit('error', [new Item('error', true, {'message': helper.buildMessage(CONFIGS['message']['tier_unknown_item_type'], [params['service']])})]);
			}
		}
		
	});
	
};

// -----------------------------------------------------------------------------------------------
util.inherits(Tier, events.EventEmitter);

// -----------------------------------------------------------------------------------------------
Tier.prototype.getName = function(){ return this._name; }
// -----------------------------------------------------------------------------------------------
Tier.prototype.getServiceCount = function(){ return _.size(this._queue); };

// -----------------------------------------------------------------------------------------------
/*Tier.prototype.addServices = function(services){ 
  var self = this;
  
  _.forEach(services, function(service){ 
    self._services.push(service); 
  }); 
};*/

// -----------------------------------------------------------------------------------------------
Tier.prototype.process = function(headers, item){
  var self = this;
  
  // Setup a heartbeat monitor to make sure that we don't get stuck with services in the holding queue
  var heartbeat = setInterval(function(){
		if(_.size(self._queue) <= 0){
      LOGGER.log('debug', 'No more items to process, sending services in holding queue to next tier.');
      
      clearInterval(heartbeat);
			
			// Send a complete message along with any services left in the holding queue. 
			// They will be passed to the next tier
			self.emit('complete', self._holdingQueue);
    }

  }, 500);

  // Process the services in parallel
  _.each(self._services, function(service){
    if(service instanceof Service){
			
			self._callService(headers, service, item);
			
		}else{
			// this is not a valid service!
			self.emit('error', new Item('error', false, {'level': 'fatal', 
															'message': helper.buildMessage(CONFIGS['message']['tier_not_a_service'], [service.getDisplayName()])}))
		}
    
  });
};

// -----------------------------------------------------------------------------------------------
Tier.prototype._callService = function(headers, service, item){
	var newItem = new Item(item.getType(), false, item.getAttributes()),
			self = this;
	
	// Check to see if the item has enoough info for the service to dispatch
  if(self._hasMinimumCitation(CONFIGS['rules']['minimum_item_groups'][service.getName()], item) || 
										_.contains(CONFIGS['rules']['dispatch_always'], service.getName())){
	
		// Error!
		service.on('error', function(error){
			LOGGER.log(error.getAttribute('level'), error.getAttribute('message'));
			
			self.emit('response', {'service': service.getDisplayName(), 'original': item, 'new': error});
			
			self._queue.delete(service);
		});
		
		// Success
		service.on('success', function(items){
			LOGGER.log('info', service.getName() + ' responded.');
			
			self._augmentItem(newItem, items, function(){
					
				self.emit('response', {'service': service.getDisplayName(), 'original': item, 'new': items});
			
				// Try to process the services on hold if the item was augmented
				_.forEach(self._holdingQueue, function(held){
					LOGGER.log('info', 'Taking ' + service.getName() + ' out of the holding queue.');
					
					self._holdingQueue.delete(held);
					
					self._callService(headers, held, item);
				});
			
				self._queue.delete(service);
			});
			
		});
		
		LOGGER.log('calling ' + service.getName());
		service.call(item, headers);
							
	}else{
		LOGGER.log('info', 'Placing ' + service.getName() + ' into the holding queue.');
		
		self._holdingQueue.push(service);
	}
};

// -----------------------------------------------------------------------------------------------
Tier.prototype._augmentItem = function(currentItem, newItems, callback){
	
	_.forEach(newItems, function(item){
		
	  // If the result contains any information for the current item, remove it from the result
	  item.getAttributes().forEach(function(value, key){
	    if(currentItem.hasAttribute(key)){
	      // Remove it because the client already knows about it!
	      item.removeAttribute(key);
      
	    }else{
	      // Otherwise the client doesn't know about it so add it to the master item
	      currentItem.addAttribute(key, value);
	    }
	  });
			
	});
};

// -----------------------------------------------------------------------------------------------
Tier.prototype._hasMinimumCitation = function(rules, item){
  var ret = true;
  
  if((typeof rules != 'undefined') && (typeof item != 'undefined')){
    
    // Loop through the items in the list, these are 'AND' rules
    _.forEach(rules, function(andRule){
      
      // Don't do any further tests if we've already failed!
      if(ret){
        // If the rule is an array of values
        if(_.isArray(andRule)){
          var valid = false;
          
          // Loop through those values and treat them as an 'OR' test
          _.forEach(andRule, function(orRule){
            // If the rule is for an array field (e.g. a child), make sure there is at least one item
            if(item.getAttribute(orRule) instanceof Array){
              if(_.size(item.getAttribute(orRule)) > 0){
                valid = true;
              }
              
            }else{
              // If one of the items is present then the test passed
              if(item.hasAttribute(orRule)){
                valid = true;
              }
            }
          });
          
          ret = valid;
        
        }else{
          // If the rule is for an array field (e.g. a child), make sure there is at least one item
          if(item.getAttribute(andRule) instanceof Array){
            if(_.size(item.getAttribute(andRule)) <= 0){
              ret = false;
            }
            
          }else{
            // Otherwise there is only one value so make sure it exists
            if(!item.hasAttribute(andRule)){
              ret = false;
            }
          }
        }
      }
    });
  }

  return ret;
};




// -----------------------------------------------------------------------------------------------
/*Tier.prototype._dispatchService = function(socket, item, service, callback){
  var self = this;
  var augmenter = require('./augmenter.js');
  var encoder = new Encoder();
	
  try{
    var headers = (typeof socket.handshake != 'undefined') ? socket.handshake.headers : {}
    
    this._callService(service, item, headers, function(result){
      
      try{
        if(typeof result != 'undefined'){
          
          if(result instanceof Array){
						// An array of results was returned by the service so process them all
						_.forEach(result, function(it){
							if(typeof CONFIGS['data']['objects'][it.getType()] != 'undefined'){

                // Augment the original citation
                if(item.getType() == it.getType()){
                  augmenter.augmentItem(item, it);
                }

                // Don't send back a message if the item had no new attributes, authors, or resources
                if(it.hasAttributes()){
                  self._sendItemToClient(socket, service, it);
                }
              }
            }); 
            
          }else if(result instanceof Item){
            
            if(typeof CONFIGS['data']['objects'][result.getType()] != 'undefined'){
            
              // Augment the original citation
              if(item.getType() == result.getType()){
                augmenter.augmentItem(item, result);
              }

              self._sendItemToClient(socket, service, result);
            
            }else{
              // Unknown data type, likely an error from the service
              var json = serializer.itemToJsonForClient(service.getDisplayName(), result);
              
              socket.emit('error', json);
            }
            
          }else{
            // Service returned an error!
            self._sendItemToClient(socket, service, result);
          }
          
        }else{
          LOGGER.log('info', service.getName() + ' did not return any results');
        }

        callback(item);
        
      }catch(e){
        LOGGER.log('warn', 'Unable to process the results from the service, ' + service.getName() + ', ' + e.message + '!');
        
				var err = new Item('error', false, {'level':'warning',
										'message':helper.buildMessage(CONFIGS['message']['tier_unable_to_process_results'], [service.getDisplayName()])});
										
        self._sendItemToClient(socket, service, err);
        callback(item);
      }
    });

  }catch(e){
    LOGGER.log('error', e.message);
    LOGGER.log('error', e.stack);
    
		var err = new Item('error', false, {'level':'warning',
										'message':helper.buildMessage(CONFIGS['message']['tier_unable_to_process_results'], [service.getDisplayName()])});
    
		this._sendItemToClient(socket, service, err);
    callback(item);
  }
};
  
// -----------------------------------------------------------------------------------------------
Tier.prototype._sendItemToClient = function(socket, service, item){
  var now = new Date(),
      self = this;

  // Find the items children and emit them separately
  _.forEach(CONFIGS['data']['objects'][item.getType()]['children'], function(child){
    // If the item has that type of children and the service is allowed to return that item type
    if((typeof item.getAttribute(child + 's') != 'undefined') && service.returnsItemType(child)){
      
      _.forEach(item.getAttribute(child + 's'), function(kid){
        self._sendItemToClient(socket, service, kid);
      });
      
      // Remove the children so they don't get resent
      item.removeAttribute(child + 's');
    }
  });
  
  // Send the item to the client ONLY if it has attributes AND the service is allowed to return that item type!
  if(item.hasAttributes() && (service.returnsItemType(item.getType()) || item.getType() == 'error')){
    var json = serializer.itemToJsonForClient(service.getDisplayName(), item);

    socket.emit(item.getType(), json);
	}
};
  
// -----------------------------------------------------------------------------------------------
Tier.prototype._callService = function(service, item, headers, callback){
  setTimeout(function(){ 
    LOGGER.log('info', 'Calling ' + service.getName());
    
    service.call(item, headers, callback);
  });
};*/

// -----------------------------------------------------------------------------------------------
module.exports = Tier;