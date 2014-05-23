require("../init.js");

var events = require('events'),
		mockery = require('./mockery.js');
		
// Add a new setter so we can send all HTTP service calls to our mock server!
Service.prototype.setTarget = function(value){ this._target = value; };
		
describe('tier.js', function(){
	this.timeout(10000);
	
	var getAttributeMap = undefined,
			processTier = undefined,
			tiers = [],
			rootItem = '',
			returnField = '',
			returnValue = 'blah-blah',
			item = undefined,
			mockServer = undefined;
	
	// ---------------------------------------------------------------------------------------------------
	before(function(done){
		_.forEach(CONFIGS['data']['objects'], function(config, name){
			if(typeof config['root'] != 'undefined'){
				rootItem = name;
				
				returnField = config['attributes'][0];
			}
		});

		item = new Item(rootItem, true, {});
		
		// Spin up some stub http servers for testing
		mockServer = mockery.spinUpServer(returnField, returnValue);
				
/*
    getAttributeMap = function(type, value){
      var map = {};

      if(typeof CONFIGS['data']['objects'][type] != 'undefined'){
        _.forEach(CONFIGS['data']['objects'][type]['attributes'], function(attribute){
          map[attribute] = value;
        });
    
        if(typeof CONFIGS['data']['objects'][type]['children'] != 'undefined'){
          _.forEach(CONFIGS['data']['objects'][type]['children'], function(child){
            map[child + 's'] = [getAttributeMap(child, value)];
          });
        }
      }
  
      return map;
    };
		
		// Get the root item
		_.forEach(CONFIGS['data']['objects'], function(def, type){
			if(def['root'] == true){
				rootItem = type;
			}
		});
		
		// Spin up some stub http servers for testing
		mockServer = mockery.spinUpServer(returnField, returnValue);
*/
		done();
	});

	// ---------------------------------------------------------------------------------------------------
	after(function(done){
		mockServer.close();
		
		console.log('shutdown mock server.');
		done();
	});
	
	// ---------------------------------------------------------------------------------------------------
	beforeEach(function(done){
		// ----------------------------------------------------------------------
		// Build out the tiers and their services as defined in the config
		tiers = [];
		
		_.forEach(CONFIGS['services']['tiers'], function(svcs, tier){
			var mockServices = [];
			
			_.forEach(svcs, function(def, name){
				var svc = new Service(name);
				svc.setTarget('http://localhost:9000/success');
				
				mockServices.push(svc);
			});
			
			var tier = new Tier(tier);
			tier.emit('register', mockServices);
			
			tiers.push(tier);
		});
		
		done();
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should return the name and the service count!', function(){
		var tier = new Tier('test');
		
		assert.equal('test', tier.getName());
		assert.equal(0, tier.getServiceCount());
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should be able to register services!', function(){
		var tier = new Tier('test');
		
		assert.equal('test', tier.getName());
		assert.equal(0, tier.getServiceCount());
		
		tier.emit('register', [new Service('test'), new Service('test2')]);
		assert.equal(2, tier.getServiceCount());
		
		tier.emit('register', [new Service('test3')]);
		assert.equal(3, tier.getServiceCount());
	});

	// ---------------------------------------------------------------------------------------------------
	it('should not be able to dispatch any services due to minimum item attribute rules!', function(done){
		var _ret = [],
				_complete = false;
		
		_.forEach(tiers, function(tier){
			
			var heartbeat = setInterval(function(){
				if(_complete){
					clearInterval(heartbeat);
				
					console.log(_ret);
					
					done();
				}				
			}, 500);
			
			tier.on('success', function(item){
				_ret.push(item);
			});
			
			tier.on('error', function(error){
				_ret.push(error);
			});
			
			tier.on('complete', function(leftovers){
				console.log('tier ' + tier.getName() + ' had ' + _.size(leftovers) + ' leftover services.');
				_complete = true;
			});
			
			console.log('processing tier ' + tier.getName());
			tier.process({}, new Item(rootItem, false, {}));
		});
	});
	
	// ---------------------------------------------------------------------------------------------------
/*	it('should negotiate but be unable to call any of the services due to minimum citation check', function(done){
		var _complete = 0,
				svcsResponding = [],
				runAlwaysCount = 0;
		
	  // Setup a heartbeat monitor
	  var heartbeat = setInterval(function(){
			if(_complete >= _.size(tiers)){
	      clearInterval(heartbeat);
		
				console.log('.... responses received from mocks for: ' + svcsResponding);
		
				assert.equal(runAlwaysCount, _.size(svcsResponding));
		
	      done();
	    }
	  }, 1000);
				
		_.forEach(tiers, function(tier){
			var socket = new events.EventEmitter(),
					item = undefined;
			
			console.log('checking tier ' + tier.getName() + ' with an invalid item.');
		
			// Create a socket event for each data type.
			_.forEach(CONFIGS['data']['objects'], function(def, type){
				if(typeof def['root'] != 'undefined'){
					item = helper.mapToItem(type, false, {'foo':'bar'});
				}
			
				socket.on(type, function(data){
					var json = JSON.parse(data);
					
					// If this is the first NON-ERROR response from the service record the service
					if(!_.contains(svcsResponding, json['service']) && (typeof json['error'] == 'undefined')){
						svcsResponding.push(json['service']);
					}
					
				});
			});
		
			socket.on('complete', function(data){
				// Make sure the 'dispatch_always' services returned data
				_.forEach(tier.getServiceNames(), function(service){
					if(_.contains(CONFIGS['rules']['dispatch_always'], service)){
						runAlwaysCount++;
						
						assert(_.contains(svcsResponding, tier.getServiceDisplayName(service)));
					}
				});
				
				_complete++;
			});
		
			tier.negotiate(socket, item, function(augmentedItem, leftoverServices){
				socket.emit('complete', CONFIGS['message']['broker_response_success']);
			});
		});
		
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should negotiate and return messages from each service', function(done){
		var _complete = 0,
				svcsResponding = [],
				totalSvcs = 0;
		
		// Count up all of the services
		_.forEach(tiers, function(tier){
			totalSvcs += tier.getServiceCount();
		});
		
	  // Setup a heartbeat monitor
	  var heartbeat = setInterval(function(){
			if(_complete >= _.size(tiers)){
	      clearInterval(heartbeat);
				
				console.log('.... responses received from mocks for: ' + svcsResponding);
				
				assert.equal(totalSvcs, _.size(svcsResponding));
				
	      done();
	    }
	  }, 1000);
		
		// Process each tier in order
		_.forEach(tiers, function(tier){
			var socket = new events.EventEmitter(),
					item = undefined;
		
			console.log('checking tier ' + tier.getName() + ' with a valid item.');
		
			// Create a socket event for each data type.
			_.forEach(CONFIGS['data']['objects'], function(def, type){
				if(typeof def['root'] != 'undefined'){
					item = helper.mapToItem(type, false, getAttributeMap(type, 'bar'));
				}
			
				socket.on(type, function(data){
					var json = JSON.parse(data);
					
					// If this is the first NON-ERROR response from the service record the service
					if(!_.contains(svcsResponding, json['service']) && (typeof json['error'] == 'undefined')){
						svcsResponding.push(json['service']);
					}
					
				});
			});
		
			socket.on('complete', function(data){
				// Make sure the 'dispatch_always' services returned data
				_.forEach(tier.getServiceNames(), function(service){
					if(_.contains(CONFIGS['rules']['dispatch_always'], service)){
						assert(_.contains(svcsResponding, tier.getServiceDisplayName(service)));
					}
				});
				
				_complete++;
			});
		
			tier.negotiate(socket, item, function(augmentedItem, leftoverServices){
				socket.emit('complete', CONFIGS['message']['broker_response_success']);
			});
		});
			
	});*/
	
	
	// ---------------------------------------------------------------------------------------------------
/*	it('should return only the services that meet the minimum item attributes rules', function(done){
		var rootItem = '',
				_complete = 0,
				required = {},
				children = [],
				childAttributes = {};
				
		// Create the item for the root object
		_.forEach(CONFIGS['data']['objects'], function(def, type){
			if(typeof def['root'] != 'undefined'){
				rootItem = type;
			}
		});

		children = CONFIGS['data']['objects'][rootItem]['children'] || [];

		// Add any required attributes
		_.forEach(CONFIGS['rules']['objects'][rootItem], function(rules, attribute){
			required[attribute] = 'yadda';
		});

		_.forEach(children, function(child){
			var params = {};
			
			_.forEach(CONFIGS['data']['objects'][child]['attributes'], function(attribute){
				params[attribute] = 'blah';
			});
			
			childAttributes[child] = params;
		});

	  // Setup a heartbeat monitor at the top to verify that all rules passed
	  var heartbeat = setInterval(function(){
			if(_complete >= _.size(CONFIGS['rules']['minimum_item_groups'])){
	      clearInterval(heartbeat);
			
				console.log('.... responses received from all services: ' + svcsResponding);
			
				assert.equal(_complete, _.size(CONFIGS['rules']['minimum_item_groups']));
			
	      done();
	    }
	  }, 1000);


		// Expect them all to PASS
		_.forEach(CONFIGS['rules']['minimum_item_groups'], function(rules, service){
			var responded = false;

			
			// Check each tier (because the service will only be attached to one tier)
			_.forEach(tiers, function(tier){
				
				// If the service hasn't responded to a prior tier
				if(!responded){
					var socket = new events.EventEmitter(),
							isDone = false;
			
					console.log('checking to see if tier ' + tier.getName() + ' called ' + service);
			
					socket.on(rootItem, function(data){
						var json = JSON.parse(data);
				
						// If this is the first NON-ERROR response from the service record the service
						if(json['service'] == tier.getServiceDisplayName(service)){
							responded = true;
						}
					});
			
					socket.on('complete', function(data){
						isDone = true;
					
						console.log('.... responded? ' + responded);
					
						if(responded){
							_complete++;
						}
					});
			
					var item = new Item(rootItem, false, required);
					
					// Setup the attributes according to the rules for the service
					_.forEach(rules, function(andRule){
						console.log(andRule);
						
						if(andRule instanceof Array){
							if(_.contains(children, _.first(andRule).slice(0, -1))){
								console.log('first: ' + _.first(andRule) + ' == ' + _.first(andRule).slice(0, -1));
								
								item.addAttribute(_.first(andRule), [new Item(_.first(andRule).slice(0, -1), false, childAttributes[_.first(andRule).slice(0, -1)])]);
							}else{
								item.addAttribute(_.first(andRule), 'foo-bar');
							}
						
						}else{
							if(_.contains(children, andRule.slice(0, -1))){
								console.log('first: ' + andRule + ' == ' + andRule.slice(0, -1));
								
								item.addAttribute(andRule, [new Item(andRule.slice(0, -1), false, childAttributes[andRule.slice(0, -1)])]);
							}else{
								item.addAttribute(andRule, 'foo-bar');
							}
						}
					});
			
					console.log('.... sending ' + item);
			
					tier.negotiate(socket, item, function(augmentedItem, leftoverServices){
						socket.emit('complete', CONFIGS['message']['broker_response_success']);
					});
				}
			});
		
		});
		
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should correctly pass services on hold to the next tier', function(done){
		
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should handle errors from a service correctly', function(done){
		
		// Undefined responses
		
		// Error messages from service
		
	});*/
	
});


// ---------------------------------------------------------------------------------------------------
Tier.prototype.getServiceDisplayName = function(serviceName){
	var ret = '';
	_.forEach(this._services, function(service){
		if(service.getName() == serviceName){
			ret = service.getDisplayName();
		}
	});
	return ret;
};
// ---------------------------------------------------------------------------------------------------
Tier.prototype.getServiceNames = function(){
	var ret = [];
	_.forEach(this._services, function(service){
		ret.push(service.getName());
	});
	return ret; 
};
// ---------------------------------------------------------------------------------------------------
Tier.prototype.getServices = function(){ return this._services; }

// ---------------------------------------------------------------------------------------------------
// mock the actual call to the service
// ---------------------------------------------------------------------------------------------------
Tier.prototype._callService = function(headers, service, item){
  var obj = undefined;
	
	buildItemMap = function(type, value){
    var map = {};

    if(typeof CONFIGS['data']['objects'][type] != 'undefined'){
      
      _.forEach(CONFIGS['data']['objects'][type]['attributes'], function(attribute){
        map[attribute] = value;
      });
  
      if(typeof CONFIGS['data']['objects'][type]['children'] != 'undefined'){
        _.forEach(CONFIGS['data']['objects'][type]['children'], function(child){
          map[child + 's'] = [buildItemMap(child, value)];
        });
      }
    }

    return map;
	}
	
	// Build the response objects
	if(service.getName() == 'error'){
		obj = helper.mapToItem('error', false, {'level' : 'warning', 'message': 'you got an error!'});
		
	}else{
		_.forEach(CONFIGS['data']['objects'], function(def, type){

			if(typeof def['root'] != 'undefined'){
				obj = helper.mapToItem(type, false, buildItemMap(type, 'blah'));
			
			}else{
				obj.addAttribute(type + 's', [helper.mapToItem(type, false, buildItemMap(type, 'foo')), 
																			 helper.mapToItem(type, false, buildItemMap(type, 'bar'))]);
			}
		});
	}
	
	callback([obj]);
};