require('../index.js');

var net = require('http'),
		url = require('url');
				
		
// ---------------------------------------------------------------------------------------------------
// Mock some methods onto the Service object so we can manipulate and view all attributes
// ---------------------------------------------------------------------------------------------------
Service.prototype.getMaxAttempts = function(){ return this._maxAttempts; };
Service.prototype.setMaxAttempts = function(value){ this._maxAttempts = value; };
Service.prototype.getTimeout = function(){ return this._timeout; };
Service.prototype.setTimeout = function(value){ this._timeout = value; };
Service.prototype.getTranslator = function(){ return this._translator; };
Service.prototype.setTranslator = function(value){ this._translator = value; };
Service.prototype.getTarget = function(){ return this._target; };
Service.prototype.setTarget = function(value){ this._target = value; };
Service.prototype.setReferrerBlock = function(values){ this._referrerBlock = values; };
Service.prototype.setItemTypes = function(values){ this._itemTypesReturned = values; };
// ---------------------------------------------------------------------------------------------------

				
describe('service.js', function(){
	this.timeout(10000);
	
	var item = undefined,
			returnField = undefined,
			returnValue = 'foo-bar',
			mockService = undefined;
	
	// ---------------------------------------------------------------------------------------------------
	before(function(done){
		var type = '';
		
		_.forEach(CONFIGS['data']['objects'], function(config, name){
			if(typeof config['root'] != 'undefined'){
				type = name;
				
				returnField = config['attributes'][0];
			}
		});

		item = new Item(type, true, {});
		
		// Spin up some stub http servers for testing
		mockService = spinUpServer(returnField, returnValue);

		done();
	});
	
	// ---------------------------------------------------------------------------------------------------
	after(function(done){
		mockService.close();
		
		console.log('shutdown mock service.');
		done();
	});

	
	// ---------------------------------------------------------------------------------------------------
	it('should throw an error if no name is supplied!', function(){
		assert.throws(function(){ new Service(); });
		assert.throws(function(){ new Service(undefined); });
		assert.throws(function(){ new Service(''); });
	});

	// ---------------------------------------------------------------------------------------------------
	it('undefined service should return as empty service and disabled!', function(){
		var svc = new Service('tester');
		
		assert(!svc.isEnabled());
		assert.equal('tester', svc.getName());
		assert.equal('tester', svc.getDisplayName());
		assert.equal('tester', svc.toString());
		
		assert.equal(1, svc.getMaxAttempts());
		assert.equal(30000, svc.getTimeout());
		assert.equal('undefined', typeof svc.getTarget());
		assert.equal('undefined', typeof svc.getTranslator());
		assert.equal(0, _.size(svc.getReferrerBlock()));
		assert.equal(false, svc.returnsItemType(''));
		assert.equal(false, svc.returnsItemType('foo'));
	});
		
	// ---------------------------------------------------------------------------------------------------
	it('should set the attributes appropriately', function(){
		// Test all of the services defined in the ./config/services.yaml to make sure they initialize
		_.forEach(CONFIGS['services']['tiers'], function(services, tier){
			_.forEach(services, function(config, service){
				var svc = new Service(service);
		
				assert(config['enabled'] == svc.isEnabled());
				assert.equal(service, svc.getName());
				assert.equal(service, svc.toString());
				assert.equal((typeof config['display_name'] == 'string' ? config['display_name'] : service), svc.getDisplayName());
				
				assert.equal((typeof config['max_attempts'] != 'undefined' ? config['max_attempts'] : 1), svc.getMaxAttempts());
				assert.equal((typeof config['timeout'] != 'undefined' ? config['timeout'] : 30000), svc.getTimeout());
				assert.equal(config['target'], svc.getTarget());
				
				if(typeof config['translator'] != 'undefined'){
					assert.equal(Translator, typeof svc.getTranslator());
				}
			
				assert.equal(_.size(config['do_not_call_if_referrer_from']), _.size(svc.getReferrerBlock()));
				
				_.forEach(config['do_not_call_if_referrer_from'], function(domain){
					assert(_.contains(svc.getReferrerBlock(), domain));
				});
				
				assert.equal(false, svc.returnsItemType('foo'));
				
				_.forEach(config['items_types_returned'], function(type){
					assert(svc.returnsItemType(type));
				});
			});
		});
	});
	
// ---------------------------------------------------------------------------------------------------
// Calling the service
// ---------------------------------------------------------------------------------------------------	
	it('should throw an error when the connection to the service is refused!', function(done){
		// No Target defined!
		var _svc = new Service('tester'),
				_isItem = false,
				_msg = '';
		
		var assertions = function(){
			assert(_isItem);
			assert.equal(helper.buildMessage(CONFIGS['message']['service_no_target_defined'], [_svc.getDisplayName()]), _msg);
			
			done();
		};
		
		_svc.on('success', function(items){
			// Force an assertion failure because this should have fired an error
			assert.equal('', 'Should NOT have returned a success message!!!');
			done();
		});
		
		_svc.on('error', function(error){
			_isItem = error instanceof Item;
			_msg = error.getAttribute('message');
			
			assertions();
		});
		
		_svc.call(item, {});
	});

	// ---------------------------------------------------------------------------------------------------	
	it('should return a valid response from the service!', function(done){
		// Success HTTP 200
		var _svc = new Service('tester'),
				_isArray = false,
				_isItem = false,
				_valMatched = false,
				_count = 0;
		
		var assertions = function(){
			assert(_isArray);
			assert(_isItem);
			assert(_valMatched);
			assert.equal(1, _count);
			
			done();
		};
		
		_svc.on('success', function(items){
			_isArray = items instanceof Array;
			_count = _.size(items);
			_isItem = _.first(items) instanceof Item;
			_valMatched = returnValue == _.first(items).getAttribute(returnField);
			
			assertions();
		});
		
		_svc.on('error', function(error){
			// Force an assertion failure because this should NOT have fired an error
			assert.equal(error.getAttribute('message'), 'Should have returned a success message!!!');
			done();
		});
		
		_svc.setTarget("http://localhost:9000/success");
		_svc.call(item, {});
	});

	// ---------------------------------------------------------------------------------------------------	
	it('should return a 404 not found from the service!', function(done){
		// No results found!
		var _svc = new Service('tester'),
				_isArray = false,
				_isItem = false,
				_count = 0,
				_itemsAttributeCount = 0;

		var assertions = function(){
			// Call should return one empty Item in an Array
			assert(_isArray);
			assert(_isItem);
			assert.equal(1, _count);
			assert.equal(0, _itemsAttributeCount);
			
			done();
		};

		_svc.on('success', function(items){
			_isArray = items instanceof Array;
			_count = _.size(items);
			
			_isItem = _.first(items) instanceof Item;
			
			if(_.first(items) instanceof Item){
				_itemsAttributeCount = _.size(_.first(items).getAttributes());
			}
			
			assertions();
		});

		_svc.on('error', function(error){
			// Force an assertion failure because this should NOT have fired an error
			assert.equal(error.getAttribute('message'), 'Should have returned a success message!!!');
			done();
		});

		_svc.setTarget("http://localhost:9000/not_found");
		_svc.call(item, {});
		
	});

	// ---------------------------------------------------------------------------------------------------	
	it('should return a 400 bad request from the service!', function(done){	
		// Bad JSON sent to end service!
		var _svc = new Service('tester'),
				_isItem = false,
				_msg = '';

		var assertions = function(){
			assert(_isItem);
			assert.equal(helper.buildMessage(CONFIGS['message']['service_bad_request'], [_svc.getDisplayName()]), _msg);
	
			done();
		};
		
		_svc.on('success', function(items){
			// Force an assertion failure because this should have fired an error
			assert.equal('', 'Should NOT have returned a success message!!!');
			done();
		});
		
		_svc.on('error', function(error){
			_isItem = error instanceof Item;
			_msg = error.getAttribute('message');
			
			assertions();
		});
		
		_svc.setTarget("http://localhost:9000/bad_request");
		_svc.call(item, {});
	});
	
	// ---------------------------------------------------------------------------------------------------	
	it('should return a 500 warning error from the service!', function(done){
		// Warning received from the target
		var _svc = new Service('tester'),
				_isItem = false,
				_level = '',
				_msg = '';
		
		var assertions = function(){
			assert(_isItem);
			assert.equal('warning', _level);
			assert.equal('foobar', _msg);
			
			done();
		};
		
		_svc.on('success', function(items){
			// Force an assertion failure because this should have fired an error
			assert.equal('', 'Should NOT have returned a success message!!!');
			done();
		});
		
		_svc.on('error', function(error){
			_isItem = error instanceof Item;
			_level = error.getAttribute('level');
			_msg = error.getAttribute('message');
			
			assertions();
		});
		
		_svc.setTarget("http://localhost:9000/warning");
		_svc.call(item, {});
	});
	
	// ---------------------------------------------------------------------------------------------------	
	it('should return a 500 error from the service!', function(done){
		// Warning received from the target
		var _svc = new Service('tester'),
				_isItem = false,
				_level = '',
				_msg = '';
		
		var assertions = function(){
			assert(_isItem);
			assert.equal('error', _level);
			assert.equal('foobar', _msg);
			
			done();
		};
		
		_svc.on('success', function(items){
			// Force an assertion failure because this should have fired an error
			assert.equal('', 'Should NOT have returned a success message!!!');
			done();
		});
		
		_svc.on('error', function(error){
			_isItem = error instanceof Item;
			_level = error.getAttribute('level');
			_msg = error.getAttribute('message');
			
			assertions();
		});
		
		_svc.setTarget("http://localhost:9000/error");
		_svc.call(item, {});
	});
	
	// ---------------------------------------------------------------------------------------------------	
	it('should return a 500 fatal error from the service!', function(done){
		// Warning received from the target
		var _svc = new Service('tester'),
				_isItem = false,
				_level = '',
				_msg = '';
		
		var assertions = function(){
			assert(_isItem);
			assert.equal('fatal', _level);
			assert.equal('foobar', _msg);
			
			done();
		};
		
		_svc.on('success', function(items){
			// Force an assertion failure because this should have fired an error
			assert.equal('', 'Should NOT have returned a success message!!!');
			done();
		});
		
		_svc.on('error', function(error){
			_isItem = error instanceof Item;
			_level = error.getAttribute('level');
			_msg = error.getAttribute('message');
			
			assertions();
		});
		
		_svc.setTarget("http://localhost:9000/fatal");
		_svc.call(item, {});
	});
	
	// ---------------------------------------------------------------------------------------------------	
	it('should return an id mismatch!', function(done){
		// Bad JSON sent to end service!
		var _svc = new Service('tester'),
				_isItem = false,
				_msg = '';

		var assertions = function(){
			assert(_isItem);
			assert.equal(helper.buildMessage(CONFIGS['message']['service_wrong_response'], [_svc.getDisplayName()]), _msg);
	
			done();
		};
		
		_svc.on('success', function(items){
			// Force an assertion failure because this should have fired an error
			assert.equal('', 'Should NOT have returned a success message!!!');
			done();
		});
		
		_svc.on('error', function(error){
			_isItem = error instanceof Item;
			_msg = error.getAttribute('message');
			
			assertions();
		});
		
		_svc.setTarget("http://localhost:9000/wrong_id");
		_svc.call(item, {});
	});
	
	// ---------------------------------------------------------------------------------------------------	
	it('should return an timeout!', function(done){
		// Bad JSON sent to end service!
		var _svc = new Service('tester'),
				_isItem = false,
				_msg = '';

		var assertions = function(){
			assert(_isItem);
			assert.equal(helper.buildMessage(CONFIGS['message']['service_timeout'], [_svc.getDisplayName()]), _msg);
	
			done();
		};
		
		_svc.on('success', function(items){
			// Force an assertion failure because this should have fired an error
			assert.equal('', 'Should NOT have returned a success message!!!');
			done();
		});
		
		_svc.on('error', function(error){
			_isItem = error instanceof Item;
			_msg = error.getAttribute('message');
			
			assertions();
		});
		
		_svc.setTarget("http://localhost:9000/timeout");
		_svc.call(item, {});
	});
	
	// ---------------------------------------------------------------------------------------------------	
	it('should return an error when the service returned an unknown item!', function(done){
		// Bad JSON sent to end service!
		var _svc = new Service('tester'),
				_isItem = false,
				_msg = '';

		var assertions = function(){
			assert(_isItem);
			assert.equal(helper.buildMessage(CONFIGS['message']['service_unknown_item'], [_svc.getDisplayName()]), _msg);
	
			done();
		};
		
		_svc.on('success', function(items){
			// Force an assertion failure because this should have fired an error
			assert.equal('', 'Should NOT have returned a success message!!!');
			done();
		});
		
		_svc.on('error', function(error){
			_isItem = error instanceof Item;
			_msg = error.getAttribute('message');
			
			assertions();
		});
		
		_svc.setTarget("http://localhost:9000/unknown_item");
		_svc.call(item, {});
	});
	
	// ---------------------------------------------------------------------------------------------------	
	it('should return an error when the service does NOT return JSON!', function(done){
		// Bad JSON sent to end service!
		var _svc = new Service('tester'),
				_isItem = false,
				_msg = '';

		var assertions = function(){
			assert(_isItem);
			assert.equal(helper.buildMessage(CONFIGS['message']['service_bad_json'], [_svc.getDisplayName()]), _msg);
	
			done();
		};
		
		_svc.on('success', function(items){
			// Force an assertion failure because this should have fired an error
			assert.equal('', 'Should NOT have returned a success message!!!');
			done();
		});
		
		_svc.on('error', function(error){
			_isItem = error instanceof Item;
			_msg = error.getAttribute('message');
			
			assertions();
		});
		
		_svc.setTarget("http://localhost:9000/not_json");
		_svc.call(item, {});
	});
	
	// ---------------------------------------------------------------------------------------------------	
	it('should return an error when the response overflows the buffer!', function(done){
		// Bad JSON sent to end service!
		var _svc = new Service('tester'),
				_isItem = false,
				_msg = '';

		var assertions = function(){
			assert(_isItem);
			assert.equal(helper.buildMessage(CONFIGS['message']['service_buffer_overflow'], [_svc.getDisplayName()]), _msg);
	
			done();
		};
		
		_svc.on('success', function(items){
			// Force an assertion failure because this should have fired an error
			assert.equal('', 'Should NOT have returned a success message!!!');
			done();
		});
		
		_svc.on('error', function(error){
			_isItem = error instanceof Item;
			_msg = error.getAttribute('message');
			
			assertions();
		});
		
		_svc.setTarget("http://localhost:9000/flood_buffer");
		_svc.call(item, {});
	});

});

// ----------------------------------------------------------------------------------------------
// Mock external service for testing
// ----------------------------------------------------------------------------------------------
function spinUpServer(returnField, returnValue){
	mockService = net.createServer(function(request, response){
		var now = new Date(),
				body = '',
				bodyLen = 0,
				json = undefined;

		// Do routing 
		// ----------------------------------------------------------------------------------------------
		var route = url.parse(request.url).pathname;
					
		// Deal with timeouts
		// ----------------------------------------------------------------------------------------------
		var timeout = (route == '/timeout' ? 1 : 20000);
		
		request.setTimeout(timeout, function(){
			console.log('timeout while trying to connect to ' + self._name);
		});
		
		// Chunk up the data coming through in the request - kill it if it its too much
		// ----------------------------------------------------------------------------------------------
		request.on('data', function(data){ 
			
			if(body.length > 10000){
				request.abort();
				console.log('incoming request is too large ... aborting call.');
				console.log(data);
				
			}else{
				body += data;
			}
			 
		});
		
		// Send back the appropriate response based on the route
		// ----------------------------------------------------------------------------------------------
		request.on('end', function(){ 
			//response.writeHead(404);
			
			var json = JSON.parse(body);
				
			if(route == '/success'){
				response.writeHead(200);
				response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
															json.api_ver + "\",\"citations\":[{\"" + returnField + "\":\"" + returnValue + "\"}]}");
			
			}else if(route == '/wrong_id'){
				response.writeHead(200);
				response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"ABCD-1234\",\"api_ver\":\"" + 
															json.api_ver + "\",\"citations\":[{\"" + returnField + "\":\"" + returnValue + "\"}]}");
			
			}else if(route == '/bad_request'){
				response.writeHead(400);
				response.end();
				
			}else if(route == '/not_found'){
				response.writeHead(404);
				response.end();
															
			}else if(route == '/warning' ){
				response.writeHead(500);
				response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
															json.api_ver + "\",\"error\":{\"message\":\"foobar\",\"level\":\"warning\"}}");
			
			}else if(route == '/error'){
				response.writeHead(500);
				response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
															json.api_ver + "\",\"error\":{\"message\":\"foobar\",\"level\":\"error\"}}");
			
			}else if(route == '/fatal'){
				response.writeHead(500);
				response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
															json.api_ver + "\",\"error\":{\"message\":\"foobar\",\"level\":\"fatal\"}}");
															
			}else if(route == '/timeout'){				
//				setTimeout(function(){
					response.writeHead(200);
	//			}, 50);
			
			}else if(route == '/unknown_item'){
				response.writeHead(200);
				response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
															json.api_ver + "\",\"examples\":[{\"" + returnField + "\":\"" + returnValue + "\"}]}");
															
			}else if(route == '/not_json'){
				response.writeHead(200);
				response.end("<html><head><title>test</title></head><body><div>Hello Tester!</div></body></html>");
			
			}else if(route == '/flood_buffer'){
				response.writeHead(200);
				var msg = "{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
															json.api_ver + "\",\"citations\":[";
															
				for(var i = 0; i < CONFIGS['application']['service_max_response_length'] + 1; i++){
					msg += "{\"genre\":\"bar\",\"content_type\":\"foo\",\"isbn\":\"" + i + "\"}";
				}
				
				response.end(msg + "]}");
			
			}else{
				// Generic server error
				response.writeHead(500);
			}
			
		});
		
	});
	
	mockService.listen(9000);
	console.log('spun up mock service service on 9000');
	
	return mockService;
}


