var CONFIGS = require('./config.js'),
		LOGGER = require('./logger.js');

var Service = require('./service.js'),
		Item = require('./item.js'),
		helper = require('./helper.js'),
		Map = require('collections/map'),
		Translator = require('./translator.js'),
		Encoder = require('node-html-encoder').Encoder,
		_ = require('underscore');

/* -----------------------------------------------------------------------------------------------
 * TIER
 * ----------------------------------------------------------------------------------------------- 
 */
var Tier = function(name, services) {
	this._name = helper.safeAssign('string', name, 'tier_?');
	
	this._complete = 0;
	this._holding = 0;
	this._total = -1;
	
	this._holdingQueue = [];
	this._registeredCallback = undefined;

	// Load the services
	this._services = services;
	
	this._total = _.size(this._services);
};

// -----------------------------------------------------------------------------------------------
Tier.prototype.getName = function(){ return this._name; }
// -----------------------------------------------------------------------------------------------
Tier.prototype.getServiceCount = function(){ return _.size(this._services); };

// -----------------------------------------------------------------------------------------------
Tier.prototype.addServices = function(services){ 
	var self = this;
	
	_.forEach(services, function(service){ 
		self._services.push(service); 
	}); 
};

// -----------------------------------------------------------------------------------------------
Tier.prototype.negotiate = function(socket, item, callback){
	var self = this;
	var new_item = item;

	self._registeredCallback = callback;

	// Setup a heartbeat monitor to make sure that we don't get stuck with services in the holding queue
	var heartbeat = setInterval(function(){
		if((self._complete + self._holding) >= self._total && self._holding > 0){
			LOGGER.log('debug', 'No more items to process, sending services in holding queue to next tier. :: ' + item.toString());
			
			clearInterval(heartbeat);
			self._registeredCallback(new_item, self._holdingQueue);
		}

	}, 3000);

	// Process the services in parallel
	_.each(self._services, function(service){
		
		if(service instanceof Service){
			self._addServiceToQueue(socket, item, service, function(finalItem){
		
				// Record the state of the item so that it can be passed along
				new_item = finalItem;
		
				if(((self._complete >= self._total && self._total > 0) || self._total == 0)){
					LOGGER.log('debug', 'All calls complete for current tier. :: ' + item.toString()); 
					
					// Pass any remaining services from the holding queue so that they are available as the next tier processes
					clearInterval(heartbeat);
					self._registeredCallback(finalItem, self._holdingQueue); 
				}
		
			});
		}
		
	});
};
	
// -----------------------------------------------------------------------------------------------
Tier.prototype._augmentItem = function(currentItem, json){
	var ret = new Item(currentItem.getType(), itemDefinitions, false, new Map());
	ret.addAttributesFromJSON(json);
	
	var newVals = [];
	// If the result contains any information for the current item, remove it from the result
	ret.getAttributes().forEach(function(value, key){
		if(currentItem.hasAttribute(key)){
			// Remove it because the client already knows about it!
			ret.removeAttribute(key);
			
		}else{
			// Otherwise the client doesn't know about it so add it to the master item
			currentItem.addAttribute(key, value);
		}
	});
	
	return ret;
};

// -----------------------------------------------------------------------------------------------
Tier.prototype._addServiceToQueue = function(socket, item, service, callback){
	var self = this;
	
	// Check to see if the item has enoough info for the service to dispatch
	if(self._hasMinimumCitation(CONFIGS['rules']['minimum_item_groups'][service.getName()], item)){
			
		// If the service is already in the holding queue remove it!
		if(_.contains(self._holdingQueue, service)){
			LOGGER.log('debug', 'Removing ' + service.getName() + ' from holding queue and processing :: ' + item.toString());
			
			self._holdingQueue.pop(service);
			self._holding--;
		}
		
		self._dispatchService(socket, item, service, function(finalItem){

			// Check the holding queue to see if anything new can be called
			_.forEach(self._holdingQueue, function(svc){
				self._addServiceToQueue(socket, finalItem, svc, callback);
			});
			
			self._complete++;
			
			callback(finalItem);
		});
		
	}else{
		//Otherwise place the service in the holding queue
		LOGGER.log('debug', 'Not enough info to call ' + service.getName() + ' placing service into holding queue. :: ' + item.toString());
		
		self._holding++;
		self._holdingQueue.push(service);
	}
};

// -----------------------------------------------------------------------------------------------
Tier.prototype._dispatchService = function(socket, item, service, callback){
	var self = this;
	
	try{
		self._callService(service, item, function(result){
			var encoder = new Encoder();
			
			try{
				if(typeof result != 'undefined'){
					
					if(result instanceof Item){
						
						if(typeof CONFIGS['data']['objects'][result.getType()] != 'undefined'){
						
							// TODO: Augment the original citation
							//augmentItem(newItem, JSON.parse(result));
						
							self._sendItemToClient(socket, service.getDisplayName(), result);
						
						}else{
							// Unknown data type, likely an error from the service
							var now = new Date();
							var json = '{"time":"' + now.toJSON() + '",' +
							  '"service":"' + service.getDisplayName() + '",' +
								'"error":"' + encoder.htmlEncode(result.toString()) + '"}';
							
							socket.emit('error', json);
						}
						
					}else{
						// Service returned an error!
						var now = new Date();
						var json = '{"time":"' + now.toJSON() + '",' +
						  '"service":"' + service.getDisplayName() + '",' +
							'"error":"' + encoder.htmlEncode(result.toString()) + '"}';
							
						socket.emit('error', json);
					}
					
				}else{
					LOGGER.log('info', service.getName() + ' did not return any results :: ' + item.toString());
				}

				callback(item);
				
			}catch(e){
				LOGGER.log('warn', 'Unable to process the results from the service, ' + service.getName() + ', ' + e.message + '! :: ' + item.toString());
				LOGGER.log(e.stack);
				
				socket.emit('error', encoder.htmlEncode('Unable to process the results from ' + service.getDisplayName()));
				callback();
			}
		});

	}catch(e){
		LOGGER.log('error', e.message + ' :: ' + item.toString());
		LOGGER.log(e.stack);
		
		socket.emit('error', encoder.htmlEncode('Unable to process the results from ' + service.getDisplayName()));
		callback();
	}
};
	
// -----------------------------------------------------------------------------------------------
Tier.prototype._sendItemToClient = function(socket, serviceName, item){
	var now = new Date(),
			self = this,
			translator = new Translator(undefined);
	
	var json = '{"time":"' + now.toJSON() + '",' +
						  '"service":"' + serviceName + '",' +
							'"' + item.getType() + '":' + translator.itemToJSON(item) + '}';

	socket.emit(item.getType(), json);
	
	// Process any children attached to the item
		_.forEach(CONFIGS['data']['objects'][item.getType()]['children'], function(child){
		
		if(typeof item.getAttribute(child + 's') != 'undefined'){
			_.forEach(item.getAttribute(child + 's'), function(kid){
				self._sendJsonToClient(serviceName, kid);
			});
		}
	});
};
	
// -----------------------------------------------------------------------------------------------
Tier.prototype._callService = function(service, item, callback){
	setTimeout(function(){ 
		LOGGER.log('info', 'Calling ' + service.getName() + ' :: ' + item.toString());
		
		service.call(item, callback);
	});
};
	
// -----------------------------------------------------------------------------------------------
Tier.prototype._hasMinimumCitation = function(rules, item){
	var ret = true;
	
	if(typeof rules != undefined){
		
		// Loop through the items in the list, these are 'AND' rules
		_.forEach(rules, function(andRule){
			
			// Don't do any further tests if we've already failed!
			if(ret){
				// If the rule is an array of values
				if(_.isArray(andRule)){
					var valid = false;
					
					// Loop through those values and treat them as an 'OR' test
					_.forEach(andRule, function(orRule){
						// If one of the items is present then the test passed
						if(item.hasAttribute(orRule)){
							valid = true;
						}
					});
					
					ret = valid;
				
				}else{
					// Otherwise there is only one value so make sure it exists
					if(!item.hasAttribute(andRule)){
						ret = false;
					}
				}
			}
		});
	}

	return ret;
};

// -----------------------------------------------------------------------------------------------
module.exports = Tier;