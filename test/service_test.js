var CONFIGS = require('../lib/config.js');

var assert = require("assert"),
		_ = require('underscore'),
		net = require('http'),
		url = require('url'),
		helper = require("../lib/helper.js"),
		Service = require("../lib/service.js"),
		Item = require("../lib/item.js"),
		Translator = require("../lib/translator.js");
				

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
// ---------------------------------------------------------------------------------------------------

				
describe('service.js', function(){
	
	var svc = undefined,
			item = undefined,
			mockService = undefined;
	
	// ---------------------------------------------------------------------------------------------------
	before(function(done){
		// Spin up some stub http servers for testing
		mockService = spinUpServer();
		
		done();
	});
	
	// ---------------------------------------------------------------------------------------------------
	after(function(done){
		mockService.close();
		
		console.log('shutdown mock service.');
		done();
	});

	// ---------------------------------------------------------------------------------------------------
	beforeEach(function(done){
		item = new Item(_.keys(CONFIGS['data']['objects'])[0], true, {});
		
		svc = new Service('tester');
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
			
			});
		});
	});
	
// ---------------------------------------------------------------------------------------------------
// Calling the service
// ---------------------------------------------------------------------------------------------------	
	it('should throw an error when the connection to the service is refused!', function(done){
		
		// Doesn't fire when target is null
		assert.throws(function(){ svc.call(item, function(result){ console.log(result); }); });
		
		// Could Not Connect to Target
		svc.setTarget("http://localhost:9999/fail");
		svc.call(item, function(result){
			
			assert(result instanceof Error);
			assert.equal(helper.buildMessage(CONFIGS['message']['service_connection_refused'], [svc.getName()]), result.message);
			
			done();
		});
	});
	
	// ---------------------------------------------------------------------------------------------------	
	it('should return a valid response from the service!', function(done){
		// Success HTTP 200
		svc.setTarget("http://localhost:9000/success");
		svc.call(item, function(result){

			assert(result instanceof Item);
			assert.equal('bar', result.getAttribute('foo'));
			
			done();
		});
	}); 
	
	// ---------------------------------------------------------------------------------------------------	
	it('should return a 400 bad request from the service!', function(done){
		// Bad Request HTTP 400
		svc.setTarget("http://localhost:9000/bad_request");
		svc.call(item, function(result){
			assert(result instanceof Error);
			assert.equal(helper.buildMessage(CONFIGS['message']['service_bad_request'], ['tester']), result.message);
			
			done();
		});
	});
		
	// ---------------------------------------------------------------------------------------------------	
	it('should return a 404 not found from the service!', function(done){
		// Not Found HTTP 404
		svc.setTarget("http://localhost:9000/not_found");
		svc.call(item, function(result){

			assert(result instanceof Item);
			assert.equal(0, _.size(result.getAttributes()));
			
			done();
		});
	});
		
	// ---------------------------------------------------------------------------------------------------	
	it('should return a 500 warning error from the service!', function(done){
		// Server Error HTTP 500 warning
		svc.setTarget("http://localhost:9000/warning");
		svc.call(item, function(result){

			assert(result instanceof Item);
			assert.equal(0, _.size(result.getAttributes()));
			
			done();
		});
	});
	
	// ---------------------------------------------------------------------------------------------------	
	it('should return a 500 error from the service!', function(done){
		// Server Error HTTP 500 warning
		svc.setTarget("http://localhost:9000/error");
		svc.call(item, function(result){

			assert(result instanceof Error);
			assert.equal(helper.buildMessage(CONFIGS['message']['service_server_error'], ['tester']), result.message);
			
			done();
		});
	});
		
	// ---------------------------------------------------------------------------------------------------	
	it('should return a 500 fatal error from the service!', function(done){
		// Server Error HTTP 500 warning
		svc.setTarget("http://localhost:9000/fatal");
		svc.call(item, function(result){

			assert(result instanceof Error);
			assert.equal(helper.buildMessage(CONFIGS['message']['service_server_error_fatal'], ['tester']), result.message);
			
			done();
		});
	});
	
	// ---------------------------------------------------------------------------------------------------	
	it('should return an id mismatch!', function(done){
		// Wrong id in the response JSON
		svc.setTarget("http://localhost:9000/wrong_id");
		svc.call(item, function(result){

			assert(result instanceof Error);
			assert.equal(helper.buildMessage(CONFIGS['message']['service_wrong_response'], ['tester']), result.message);
			
			done();
		});
	});
		
	// ---------------------------------------------------------------------------------------------------	
	it('should return an timeout!', function(done){
		// Timeout
		svc.setTarget("http://localhost:9000/timeout");
		
		
		svc.call(item, function(result){

			assert(result instanceof Error);
			assert.equal(helper.buildMessage(CONFIGS['message']['service_timeout'], ['tester']), result.message);
			
			done();
		});
		
	});
	
	// ---------------------------------------------------------------------------------------------------	
	it('should return an error when the service returned an unknown item!', function(done){
		// Unknown item type returned
		svc.setTarget("http://localhost:9000/unknown_item");
		svc.call(item, function(result){

			assert(result instanceof Error);
			assert.equal(helper.buildMessage(CONFIGS['message']['service_unknown_item'], ['tester']), result.message);
			
			done();
		});
	});
	
	// ---------------------------------------------------------------------------------------------------	
	it('should return an error when the service does NOT return JSON!', function(done){
		// Not JSON
		svc.setTarget("http://localhost:9000/not_json");
		svc.call(item, function(result){

			assert(result instanceof Error);
			assert.equal(helper.buildMessage(CONFIGS['message']['service_bad_json'], ['tester']), result.message);
			
			done();
		});
	});
	
	// Catch Buffer Overload Attempt
	
});

// ----------------------------------------------------------------------------------------------
// Mock external service for testing
// ----------------------------------------------------------------------------------------------
function spinUpServer(){
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
			var json = JSON.parse(body);
				
			if(route == '/success'){
				response.writeHead(200);
				response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
															json.api_ver + "\",\"citations\":[{\"foo\":\"bar\"}]}");
			
			}else if(route == '/wrong_id'){
				response.writeHead(200);
				response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"ABCD-1234\",\"api_ver\":\"" + 
															json.api_ver + "\",\"citations\":[{\"foo\":\"bar\"}]}");
			
			}else if(route == '/bad_request'){
				response.writeHead(400);
				response.end();
				
			}else if(route == '/not_found'){
				response.writeHead(404);
				response.end();
															
			}else if(route == '/warning' ){
				response.writeHead(500);
				response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
															json.api_ver + "\",\"error\":\"foobar\",\"level\":\"warning\"}");
			
			}else if(route == '/error'){
				response.writeHead(500);
				response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
															json.api_ver + "\",\"error\":\"foobar\",\"level\":\"error\"}");
			
			}else if(route == '/fatal'){
				response.writeHead(500);
				response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
															json.api_ver + "\",\"error\":\"foobar\",\"level\":\"fatal\"}");
															
			}else if(route == '/timeout'){				
//				setTimeout(function(){
					response.writeHead(200);
	//			}, 50);
			
			}else if(route == '/unknown_item'){
				response.writeHead(200);
				response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
															json.api_ver + "\",\"examples\":[{\"foo\":\"bar\"}]}");
															
			}else if(route == '/not_json'){
				response.writeHead(200);
				response.end("<html><head><title>test</title></head><body><div>Hello Tester!</div></body></html>");
			
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


