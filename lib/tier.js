var Service = require('./service.js'),
		Item = require('./item.js'),
		helper = require('./helper.js'),
		Map = require('collections/map'),
		_ = require('underscore');

/* -----------------------------------------------------------------------------------------------
 * TIER
 * ----------------------------------------------------------------------------------------------- 
 */
var Tier = function(name, rulesConfig, services, itemDefinitions) {
	this._name = helper.safeAssign('string', name, 'tier_?');
	
	this._complete = 0;
	this._holding = 0;
	this._total = -1;
	
	this._holdingQueue = [];
	this._registeredCallback = undefined;

	this._rulesConfig = rulesConfig;

	// Load the services
	this._services = services;
	
	this._itemDefinitions = itemDefinitions;
	
	this._total = _.size(this._services);

	// -----------------------------------------------------------------------------------------------
	this.getName = function(){ return this._name; }
	// -----------------------------------------------------------------------------------------------
	this.getServiceCount = function(){ return _.size(this._services); };

	// -----------------------------------------------------------------------------------------------
	this.addServices = function(services){ 
		var self = this;
		
		_.forEach(services, function(service){ 
			self._services.push(service); 
		}); 
	};

	// -----------------------------------------------------------------------------------------------
	this.negotiate = function(socket, item, callback){
			var self = this;
			var new_item = item;
		
			self._registeredCallback = callback;

			// Setup a heartbeat monitor to make sure that we don't get stuck with services in the holding queue
			var heartbeat = setInterval(function(){
				if((self._complete + self._holding) >= self._total && self._holding > 0){
					console.log('.... no more items to process, sending services in holding queue to next tier.');
					clearInterval(heartbeat);
					self._registeredCallback(new_item, self._holdingQueue);
				}
		
			}, 3000);

			// Process the services in parallel
			_.each(self._services, function(service){
				console.log('.... examining ' + service.getName());
				
				if(service instanceof Service){
					addServiceToQueue(self, socket, item, service, function(finalItem){
				
						// Record the state of the item so that it can be passed along
						new_item = finalItem;
				
						if(((self._complete >= self._total && self._total > 0) || self._total == 0)){
							console.log('.... all calls complete for current tier.'); 
							// Pass any remaining services from the holding queue so that they are available as the next tier processes
							clearInterval(heartbeat);
							self._registeredCallback(finalItem, self._holdingQueue); 
						}
				
					});
				}
				
			});
			
		};
	
	// -----------------------------------------------------------------------------------------------
	function augmentItem(currentItem, itemDefinitions, json){
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
	}

	// -----------------------------------------------------------------------------------------------
	function addServiceToQueue(context, socket, item, service, callback){
		
		// Check to see if the item has enoough info for the service to dispatch
		if(hasMinimumCitation(context._rulesConfig['minimum_item_groups'][service.getName()], item)){
			
			// If the service is already in the holding queue remove it!
			if(_.contains(context._holdingQueue, service)){
				console.log('.... removing ' + service.getName() + ' from holding queue and processing');
				context._holdingQueue.pop(service);
				context._holding--;
			}
			
			dispatchService(socket, item, service, context._itemDefinitions, function(finalItem){
	
				// Check the holding queue to see if anything new can be called
				_.forEach(context._holdingQueue, function(svc){
					addServiceToQueue(context, socket, finalItem, svc, callback);
				});
				
				context._complete++;
				
				console.log('.... final item -> ' + finalItem.toString());
				callback(finalItem);
			});
			
		}else{
			//Otherwise place the service in the holding queue
			console.log('.... not enough info to call ' + service.getName() + ' placing service into holding queue.');
			context._holding++;
			context._holdingQueue.push(service);
		}
	}

	// -----------------------------------------------------------------------------------------------
	function dispatchService(socket, item, service, itemDefinitions, callback){
		
		try{
			callService(service, item, function(result){
				
				try{
					//augmentItem(newItem, JSON.parse(result));
					var json = JSON.parse(result);
					
					// Loop through the defined objects
					_.forEach(itemDefinitions, function(config, type){
						
						var jsonItem = json[type];
						
						if(typeof jsonItem != 'undefined'){
							
							if(_.isArray(jsonItem)){
								_.forEach(jsonItem, function(v, k){
									var tmp = new Item(type, itemDefinitions, false, new Map());
								
									if(item.getType() == type){
										tmp = augmentItem(item, itemDefinitions, v);
									
									}else{
										tmp.addAttributesFromJSON(v);
									}
									
									if(tmp.hasAttributes()){
										socket.emit(type, tmp.toJSON(service.getDisplayName()));
									}
								});
							
							}else{
								var tmp = new Item(type, itemDefinitions, false, new Map());
							
								if(item.getType() == type){
									tmp = augmentItem(item, itemDefinitions, jsonItem);
									
								}else{
									tmp.addAttributesFromJSON(jsonItem);
								}
								
								if(tmp.hasAttributes()){
									socket.emit(type, tmp.toJSON(service.getDisplayName()));
								}
							}
						}
					});
					
					console.log('after dispatch: ' + item.toString());
					
					callback(item);
					
				}catch(e){
					console.log('.... unable to process the results from the service!');
					console.log(e);
					socket.emit('error', 'Unable to process the results from ' + service.getDisplayName());
				}
			});
	
		}catch(e){
			console.log('.... ' + e);
			socket.emit('error', e);
			callback();
		}
	};
	
	// -----------------------------------------------------------------------------------------------
	function callService(service, item, callback){
		setTimeout(function(){ 
			console.log('.... calling ' + service.getName());
			
			service.call(item, callback);
		});
	};
	
	// -----------------------------------------------------------------------------------------------
	function hasMinimumCitation(rules, item){
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
	}

};

module.exports = Tier;