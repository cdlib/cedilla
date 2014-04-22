var assert = require("assert"),
		_ = require('underscore'),
		helper = require("../lib/helper.js"),
		Service = require("../lib/service.js"),
		Item = require("../lib/item.js");
				
describe('service.js', function(){
	var configManager = undefined,
			serviceDefinitions = {};

	// ---------------------------------------------------------------------------------------------------
	before(function(done){
		configManager = require("../config/config.js")
		
		// Call the configManager for the first time so that the yaml files get loaded
		configManager.getConfig('services', function(config){	
			
			// Pull the inidividual services out of the tier structures
			_.forEach(config['services']['tiers'], function(svcs, tier){
				_.forEach(svcs, function(conf, svc){
					serviceDefinitions[svc] = conf;
				});
			});
			
			done();
		});
	});
	
// ---------------------------------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------------------------------
	it("should be disabled by default!", function(){
		var conf = { max_attempts: 1, timeout: 5, display_name: 'The Tester Service', 
								 target: 'http://localhost:3000/test'};
								 
		svc = new Service('tester', conf);
		
		assert(!svc.isEnabled());
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should set the attributes appropriately', function(){
		var conf = { enabled: true, max_attempts: 1, timeout: 5, display_name: 'The Tester Service', 
								 target: 'http://localhost:3000/test', translator: 'mapping_opac', svc_specific_val: 'foo'};
								 
		svc = new Service('tester', conf);
		
		assert(svc.isEnabled());
		assert.equal('tester', svc.getName());
		assert.equal('The Tester Service', svc.getDisplayName());
		assert.equal('tester', svc.toString());
		
		// Test all of the services defined in the ./config/services.yaml to make sure they initialize
		_.forEach(serviceDefinitions, function(config, service){
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
	
// ---------------------------------------------------------------------------------------------------
// Calling the service
// ---------------------------------------------------------------------------------------------------	
	it('should call the service', function(){
		
	});
	
});