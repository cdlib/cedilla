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
  this._holdingQueue = [];
  this._queue = [];
  
  this._timeout = CONFIGS['application']['tier_timeout'] || 20000;
  
  this._running = false;

  // ----------------------------------------------------------------------------
  this.on('register', function(services){
    var self = this;

    _.forEach(services, function(service){ 
      self._queue.push(service);
    });
  });

  
  // ----------------------------------------------------------------------------
  this.on('response', function(params){
    var self = this;
    
    if(params['new'] instanceof Array){
      
      if(params['original'] instanceof Item){
        // Send out each item individually
        _.forEach(params['new'], function(item){

          self.emit('message', {'service': params['service'], 'item': item});
        });
      
      }else{
        // The original item is somehow undefined!
        self.emit('message', {'service': params['service'], 'item': new Item('error', true, {'message': CONFIGS['message']['tier_no_original_item']})});
      }
        
    }else{
      if(params['new'] instanceof Item){
        // Its an error so just pass it along
        self.emit('message', {'service': params['service'], 'item': params['new']});

      }else{
        // Otherwise this is an unknown item so throw an error
        self.emit('message', {'service': params['service'], 'item': new Item('error', true, {'message': helper.buildMessage(CONFIGS['message']['tier_unknown_item_type'], [params['service']])})});
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
Tier.prototype.process = function(headers, item){
  var self = this,
      _start = new Date(),
      _total = _.size(self._queue);
  
  // Prevent the instance from being kicked off if its already running!!!
  // The tier has specific services registered and those services can change as the broker moves through the tier stack
  // so we cannot allow the instance to process mutliple requests at once since it is a stateful object
  if(!self._running){
    self._running = true;
  
    // Setup a heartbeat monitor to make sure that we don't get stuck with services in the holding queue
    var heartbeat = setInterval(function(){
      var _now = new Date();
      
      // Timeout 
      // --------------------------------------------------------
      if((_now.getTime() - _start.getTime()) >= self._timeout){
        LOGGER.log('warning', 'Tier timed out.');
        
        clearInterval(heartbeat);
        self._running = false;
        
        self.emit('error', new Item('error', false, {'level': 'warning',
                              'message': helper.buildMessage(CONFIGS['message']['tier_timeout'], [self._name])}));
                              
        self.emit('complete', self._holdingQueue);
      }
    
      // Finish up and pass the remaining services on to the next tier.
      // -------------------------------------------------------------------------
      if((self._complete + _.size(self._holdingQueue)) >= _total){
        LOGGER.log('debug', 'No more items to process, sending services in holding queue to next tier.');
      
        clearInterval(heartbeat);
        self._running = false;
      
        // Send a complete message along with any services left in the holding queue. 
        // They will be passed to the next tier
        self.emit('complete', self._holdingQueue);
      }

    }, 500);

    // --------------------------------------------------------
    _.forEach(self._queue, function(service){
      if(service instanceof Service){
      
        self._callService(headers, service, item);
      
      }else{
        // this is not a valid service!
        self.emit('error', new Item('error', false, {'level': 'fatal', 
                                'message': helper.buildMessage(CONFIGS['message']['tier_not_a_service'], [service.getDisplayName()])}))
      }
    
    });
    
  }else{
    throw new Error('Tier ' + this._name + ' is already running!');
  }
};

// -----------------------------------------------------------------------------------------------
Tier.prototype._callService = function(headers, service, item){
  var  self = this;
  
  // Check to see if the item has enoough info for the service to dispatch
  if(self._hasMinimumCitation(CONFIGS['rules']['minimum_item_groups'][service.getName()], item)){
  
    // Error!
    service.on('error', function(error){
      LOGGER.log(error.getAttribute('level'), error.getAttribute('message'));

      self.emit('response', {'service': service.getDisplayName(), 'original': item, 'new': error});
      
      self._complete++;
    });
    
    // Success
    service.on('success', function(items){
      LOGGER.log('info', service.getName() + ' responded.');

      self._augmentItem(item, items, function(){
        self.emit('response', {'service': service.getDisplayName(), 'original': item, 'new': items});
      
        // Try to process the services on hold if the item was augmented
        _.forEach(self._holdingQueue, function(held){
          LOGGER.log('info', 'Taking ' + held.getName() + ' out of the holding queue.');

          self._holdingQueue.pop(held);
          
          self._callService(headers, held, item);
        });
          
          self._complete++;        
      });
      
    });

    service.call(item, headers);
              
  }else{
    LOGGER.log('info', 'Placing ' + service.getName() + ' into the holding queue.');
    
    self._holdingQueue.push(service);
    
    delete self._queue[_.indexOf(self._queue, service)];
  }
};

// -----------------------------------------------------------------------------------------------
Tier.prototype._augmentItem = function(currentItem, newItems, callback){
  
  _.forEach(newItems, function(item){
  
    // If the result contains any information for the current item, remove it from the result
    _.forEach(item.getAttributes(), function(value, key){
      // TODO: setup logic to prevent duplicate resources and authors. Defaulting now to allow all children!
      if(!_.contains(CONFIGS['data']['objects'][currentItem.getType()]['children'], key.slice(0, -1))){
        if(currentItem.hasAttribute(key)){
          // Remove it because the client already knows about it!
          item.removeAttribute(key);
      
        }else{
          // Otherwise the client doesn't know about it so add it to the master item
          currentItem.addAttribute(key, value);
        }
      }
    });
      
  });
  
  callback();
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
module.exports = Tier;