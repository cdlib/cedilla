require("../init.js");

var events = require('events'),
		mockery = require('./mockery.js');
		
// Add a new setter so we can send all HTTP service calls to our mock server!
Service.prototype.setTarget = function(value){ this._target = value; };
// ---------------------------------------------------------------------------------------------------
Service.prototype.call = function(item, headers){
	
	if(headers['error']){
		this.emit('response', new Item('error', false, {'level':'error','message':'You got an error!'}));
		
	}else if(headers['timeout']){
		setTimeout(function(){
			this.emit('response', new Item('error', false, {'level':'error','message':'Tier shoudl have timed out!'}));
		}, CONFIGS['application']['tier_timeout'] * 2);
		
	}else{
    
    var map = {},
				type = item.getType();

		// Only build out a full item is we're called the desired service OR none was defined!
		if(headers['service'] == this._name || (typeof headers['service'] == 'undefined')){

	    if(typeof CONFIGS['data']['objects'][type] != 'undefined'){
	      _.forEach(CONFIGS['data']['objects'][type]['attributes'], function(attribute){
	        map[attribute] = 'foo';
	      });
	    }
		}
		
		this.emit('response', [helper.mapToItem(type, false, map)]);
	}
};

		
// ---------------------------------------------------------------------------------------------------
describe('tier.js', function(){
	this.timeout(120000);
	
	var getAttributeMap = undefined,
			buildTiers = undefined,
			processTier = undefined,
			displayNames = {},
			tiers = [],
			_ret = [],
			rootItem = '',
			returnField = '',
			returnValue = 'blah-blah',
			item = undefined,
			mockServer = undefined;
	
	// ---------------------------------------------------------------------------------------------------
	before(function(done){
		// Build out the tiers and their services as defined in the config
		buildTiers = function(){
			tiers = [];
			
			_.forEach(CONFIGS['services']['tiers'], function(svcs, tier){
				var mockServices = [];
			
				_.forEach(svcs, function(def, name){
					var svc = new Service(name);
					svc.setTarget('http://localhost:9000/success');
				
					mockServices.push(svc);
				
					displayNames[name] = svc.getDisplayName();
				});
			
				var tier = new Tier(tier);
				tier.emit('register', mockServices);
			
				tiers.push(tier);
			});
		};
		
		_.forEach(CONFIGS['data']['objects'], function(config, name){
			if(typeof config['root'] != 'undefined'){
				rootItem = name;
				
				returnField = config['attributes'][0];
			}
		});

		item = new Item(rootItem, true, {});
		
		// Spin up some stub http servers for testing
		mockServer = mockery.spinUpServer(returnField, returnValue);

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
		
		processTier = function(headers, index, item, callback){
			var self = this,
					_complete = false;
		
			if(tiers[index] instanceof Tier){
				var tier = tiers[index];
				
				var heartbeat = setInterval(function(){
					if(_complete){
						clearInterval(heartbeat);

						processTier(headers, (index + 1), item, callback);
					}				
				}, 500);
			
				tier.on('success', function(item){
					_ret.push(item);
				});
			
				tier.on('error', function(error){
					_ret.push(error);
				});
			
				tier.on('complete', function(leftovers){
					if(_.size(leftovers) > 0){
						if(tiers[index + 1] instanceof Tier){
							tiers[index + 1].emit('register', leftovers);
						}
					}
					
					_complete = true;
				});
			
				tier.process(headers, item);
				
			}else{
				// We processed the final tier so call the callback
				callback(_ret);
			}
		};
		
		// Initialize the tiers
		buildTiers();
		
		done();
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should return the name and the service count!', function(){
		var tier = new Tier('test');
		
		console.log('.. TIER: checking initialization');
		
		assert.equal('test', tier.getName());
		assert.equal(0, tier.getServiceCount());
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should be able to register services!', function(){
		var tier = new Tier('test');
		
		console.log('.. TIER: checking service registration.');
		
		assert.equal('test', tier.getName());
		assert.equal(0, tier.getServiceCount());
		
		tier.emit('register', [new Service('test'), new Service('test2')]);
		assert.equal(2, tier.getServiceCount());
		
		tier.emit('register', [new Service('test3')]);
		assert.equal(3, tier.getServiceCount());
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should not allow multiple calls to process() at once.', function(done){
		var _complete = 0,
				_passed = false,
				self = this;
		
		console.log('.. TIER: verifying tier cannot be started when its already running.');
		
		var heartbeat = setInterval(function(){
			if(_complete >= 1){
				clearInterval(heartbeat);
				
				assert(_passed != false);
				done();
			}
		}, 500);
		
		var tier = tiers[0];
		var item = new Item(rootItem, true, {'foo':'bar'});
			
		_passed = assert.throws(function(){ 
			
			for(var i = 0; i <= 2; i++){
				tier.process({}, item);
			}
			
		});
		
		_complete++;
		
	});

	// ---------------------------------------------------------------------------------------------------
	it('should not be able to dispatch any services due to minimum item attribute rules!', function(done){
		console.log('.. TIER: ensuring no services are called when item does not have enough info.');
		
		processTier({}, 0, new Item(rootItem, false, {}), function(items){
			// The number of leftover services should match the number of services with minimum item attribute rules!
			assert.equal(_.size(CONFIGS['rules']['minimum_item_groups']), tiers[_.size(tiers) - 1].getServiceCount());
			
			done();
		});
	
	}); 
	
	// ---------------------------------------------------------------------------------------------------
	it('should properly augment the item', function(done){
		var _params = {};

		console.log('.. TIER: checking item augmentation');

		// Get the REQUIRED attributes
		_.forEach(CONFIGS['rules']['objects'][rootItem], function(vals, attribute){
			_params[attribute] = 'foo-bar';
		});
		
		var i = 0;
		_.forEach(CONFIGS['data']['objects'][rootItem]['attributes'], function(attribute){
			if(i <= 3){
				_params[attribute] = 'yadda-yadda';
			}
			i++;
		});
		
		var item = new Item(rootItem, true, _params);
		_ret = [];

		processTier({}, 0, item, function(results){
			
			_.forEach(results, function(result){
				if(result['item']){
					_.forEach(result['item'].getAttributes(), function(value, key){
						
						// The returned item should NOT contain the the original attributes
						assert(!_.contains(_params, key));
					});
				}
			});
			
			done();
		});
		
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should properly return an error', function(done){
		var _params = {};
		
		console.log('.. TIER: checking error handling');
		
		// Get the REQUIRED attributes
		_.forEach(CONFIGS['rules']['objects'][rootItem], function(vals, attribute){
			_params[attribute] = 'foo-bar';
		});
		
		var i = 0;
		_.forEach(CONFIGS['data']['objects'][rootItem]['attributes'], function(attribute){
			if(i <= 3){
				_params[attribute] = 'yadda-yadda';
			}
			i++;
		});
		
		var item = new Item(rootItem, true, _params);
		_ret = [];
		
		processTier({'error': true}, 0, item, function(results){
			
			_.forEach(results, function(result){
				assert(result['error'] instanceof Item);
			});
			
			done();
		});
		
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should return an item for the service when its minimum item attributes are met!', function(done){
		var _completed = 0,
				_passed = 0,
				_failed = [];
		
		console.log('.. TIER: checking minimum item attribute rules.');
		
		var heartbeat = setInterval(function(){
			if(_completed >= _.size(CONFIGS['rules']['minimum_item_groups'])){
				clearInterval(heartbeat);
				
				// The number of passed tests should match the number of services tested.
				assert.equal(_completed, _passed);
				assert.equal(0, _failed);
				
				done();
			}
		}, 500);

		
		var tryService = function(index){
			var _params = {};
			
			var i = 0;
			_.forEach(CONFIGS['rules']['minimum_item_groups'], function(rules, service){
				if(i == index){
					
					console.log('.. running minimum item attribute requirements test for ' + service);
					
					_.forEach(CONFIGS['rules']['objects'][rootItem], function(vals, attribute){
						_params[attribute] = 'foo-bar';
					});
			
					_.forEach(rules, function(vals, andRule){
						if(vals instanceof Array){
							if(_.contains(CONFIGS['data']['objects'][rootItem]['children'], _.first(vals).slice(0, -1))){
								_params[_.first(vals)] = [new Item(_.first(vals).slice(0, -1), true, {'foo':'bar'})];
							}else{
								_params[_.first(vals)] = 'yadda-yadda';
							}
						}else{
							if(_.contains(CONFIGS['data']['objects'][rootItem]['children'], vals.slice(0, -1))){
								_params[vals] = [new Item(vals.slice(0, -1), true, {'foo':'bar'})];
							}else{
								_params[vals] = 'blah-blah';
							}
						}
					});
			
					var item = new Item(rootItem, false, _params);
			
					_ret = [];
			
					processTier({'service': service}, 0, item, function(items){
						_.forEach(items, function(newItem){
					
							if(newItem['item']){
								if(_.size(newItem['item'].getAttributes()) > 0){
									if(newItem['service'] == displayNames[service]){
										_passed++;
									}
								}
						
							}else{
								_failed++;
							}

						});
			
						_completed++;
						
						if((index + 1) < _.size(CONFIGS['rules']['minimum_item_groups'])){
							buildTiers();
							
							tryService((index + 1));
						}
					});
			
				}
				i++;
			});
			
		};

		tryService(0);
	
	});

	// ---------------------------------------------------------------------------------------------------
	it('should timeout!', function(done){
		var _completed = false,
				_passed = false,
				_message = '',
				_params = {};
		
		console.log('.. TIER: verifying that tier times out.');
		
		// Get the REQUIRED attributes
		_.forEach(CONFIGS['rules']['objects'][rootItem], function(vals, attribute){
			_params[attribute] = 'foo-bar';
		});
		
		var i = 0;
		_.forEach(CONFIGS['data']['objects'][rootItem]['attributes'], function(attribute){
			if(i <= 3){
				_params[attribute] = 'yadda-yadda';
			}
			i++;
		});
		
		var heartbeat = setInterval(function(){
			if(_completed){
				
				console.log(_message);
				
				// The number of passed tests should match the number of services tested.
				assert(_passed);
				assert.equal(helper.buildMessage(CONFIGS['message']['tier_timeout'], [tier.getName()]), _message);
				
				done();
			}
		}, 500);
		
		var tier = tiers[0];
		
		tier.on('error', function(error){
			_message = error.getAttribute('message');
			_passed = true;
		});
		
		tier.on('success', function(results){
			_message = 'Got a success message when we should have received an error!';
		});
		
		tier.on('complete', function(leftovers){
			_completed = true;
		});
		
		var item = new Item(rootItem, true, _params);
		tier.process({'timeout': true}, item);
		
	});

	
});

