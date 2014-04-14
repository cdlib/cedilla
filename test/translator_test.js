var assert = require("assert"),
		_ = require('underscore'),
		ConfigurationManager = require("../config/config.js"),
		Translator = require("../lib/translator.js");


describe('translator.js', function(){
	
	var configManager = undefined; 
	var yaml = undefined;
	var translator = undefined;
	
	before(function(done){
		configManager = new ConfigurationManager();
		done();
	});
	
	// ------------------------------------------------------------------------------------------------------
	// Initialization Tests
	// ------------------------------------------------------------------------------------------------------
	describe('running initialization tests', function(){
		
		it("should not initialize without a configManager or mapping file defined!", function(){
			assert.throws(function(){ new Translator(undefined, undefined) });
		});
		
		it("should not initialize without a configManager defined!", function(){
			assert.throws(function(){ new Translator(undefined, 'mapping_openurl') });
		});
		
		it("should initialize with a configManager defined but no mapping file defined!", function(){
			assert.doesNotThrow(function(){ new Translator(configManager, undefined); });
		});
		
		it("should initialize with a configManager and a mapping file defined!", function(){
			assert.doesNotThrow(function(){ new Translator(configManager, 'mapping_openurl'); });
		});
		
	});
	
	// ------------------------------------------------------------------------------------------------------
	// NO MAPPING file
	// ------------------------------------------------------------------------------------------------------
	describe('working with NO mapping file', function(){
		
		before( function(done){
			translator = new Translator(configManager, '');
			done();
		});
		
		describe('translateKey()', function(){
			
			// ------------------------------------------------------------------------------------------------------
			it("mapping tests should return same value", function(){
				// Make sure that the translator returns the same value if there was no match
				assert.equal(translator.translateKey('foo'), 'foo');
				assert.equal(translator.translateKey('rft.genre'), 'rft.genre');
				
				assert.notEqual(translator.translateKey('foo'), 'bar');
				assert.notEqual(translator.translateKey('genre'), 'rft.genre');
			});
			
		});
		
		describe('mapToEntity()', function(){
		
		});
	});

	// ------------------------------------------------------------------------------------------------------
	// OPENURL MAPPING file
	// ------------------------------------------------------------------------------------------------------
	describe('working with mapping_openurl.yaml', function(){
		
		before( function(done){
			// Load out the original YAML so we can make sure the translator is mapping properly
			yaml = configManager.getConfig('mapping_openurl');
			translator = new Translator(configManager, 'mapping_openurl');
			done();
		});
		
		describe('translateKey()', function(){
			
			// ------------------------------------------------------------------------------------------------------
			it("should pass mapping tests", function(){
				_.forEach(yaml, function(externalName, internalName){
					
					if(externalName instanceof Array){
						// Make sure the translator matches each external name to the same internal name
						_.forEach(externalName, function(name){
							assert.equal(translator.translateKey(name), internalName);
						});
						
					}else{
						// Make sure the translator matches the external name to the internal name
						assert.equal(translator.translateKey(externalName), internalName);
					}
					
					// Make sure the translator sends back the first external value when passed the internal name
					assert(_.contains(externalName, translator.translateKey(internalName)));
				});
				
				// Make sure that the translator returns the same value if there was no match
				assert.equal(translator.translateKey('foo'), 'foo');
			});
			
			// ------------------------------------------------------------------------------------------------------
			it("should NOT pass mapping tests", function(){
				assert.notEqual(translator.translateKey('foo'), 'bar');
				assert.notEqual(translator.translateKey('rft.genre'), 'content_type');
				assert.notEqual(translator.translateKey('rft.genre'), undefined);
			});
			
		});
	});

	
});
