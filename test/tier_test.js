var assert = require("assert"),
		_ = require('underscore'),
		Service = require('../lib/service.js');
		
Service.prototype.enable = function(){ this._enabled = true; }
		
describe('tier.js', function(){
	
	var item = undefined,
			mockService = undefined;
	
	// ---------------------------------------------------------------------------------------------------
	before(function(done){
		mockService = new Service('tester');
		done();
	});
	
	// ---------------------------------------------------------------------------------------------------
	after(function(done){
		done();
	});

	// ---------------------------------------------------------------------------------------------------
	beforeEach(function(done){
//		item = new Item(_.keys(CONFIGS['data']['objects'])[0], true, {});
		done();
	});

	
	// ---------------------------------------------------------------------------------------------------
	it('should throw an error if no name is supplied!', function(){
		assert.throws(function(){ new Tier(); });
		assert.throws(function(){ new Tier(undefined); });
		assert.throws(function(){ new Tier(''); });
		assert.throws(function(){ new Tier([]); });
//		assert.throws(function(){ new Tier(undefined, []); });
//		assert.throws(function(){ new Tier('', []); });
	});
	
});


