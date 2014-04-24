var CONFIGS = require('../lib/config.js');

var assert = require("assert"),
		_ = require('underscore'),
		helper = require("../lib/helper.js"),
		Service = require("../lib/service.js"),
		Item = require("../lib/item.js");
				
describe('service.js', function(){

	// ---------------------------------------------------------------------------------------------------
	it('undefined service should return as empty service and disabled!', function(){
		svc = new Service('tester');
		
		assert(!svc.isEnabled());
		assert.equal('tester', svc.getName());
		assert.equal('tester', svc.getDisplayName());
		assert.equal('tester', svc.toString());
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should set the attributes appropriately', function(){
		// Test all of the services defined in the ./config/services.yaml to make sure they initialize
		_.forEach(CONFIGS['services']['tiers'], function(services, tier){
			_.forEach(services, function(config, service){
				var svc = new Service(service, config);
		
				assert(config['enabled'] == svc.isEnabled());
				assert.equal(service, svc.getName());
				assert.equal(service, svc.toString());
			
				if(typeof config['display_name'] == 'string'){
					assert.equal(config['display_name'], svc.getDisplayName());
				}else{
					assert.equal(service, svc.getDisplayName());
				}
			});
		});
	});
	
// ---------------------------------------------------------------------------------------------------
// Calling the service
// ---------------------------------------------------------------------------------------------------	
	it('should call the service', function(){
		
		// No target
		
		// Bad URL
		
		// Could Not Connect to Target
		
		// Success HTTP 200
		
		// Bad Request HTTP 400
		
		// Not Found HTTP 404
		
		// Server Error HTTP 500 warning
		
		// Server Error HTTP 500 error
		
		// Server Error HTTP 500 fatal
		
	});
	
});

