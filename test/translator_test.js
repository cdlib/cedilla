require('./index.js');

describe('translator.js', function(){
	var attributes = {'foo':'bar', 'one':'fish', 'two':'fish', 'red':'fish', 'blue':'fish'};
		
// ------------------------------------------------------------------------------------------------------
// Initialization Tests
// ------------------------------------------------------------------------------------------------------
	it("should initialize without a mapping file defined!", function(){
		assert.doesNotThrow(function(){ new Translator(undefined); });
		assert.doesNotThrow(function(){ new Translator(' '); });
	});
		
	// ------------------------------------------------------------------------------------------------------
	it("should NOT initialize with a missing mapping file defined!", function(){
		assert.throws(function(){ new Translator('foobar'); });
	});
	
	// ------------------------------------------------------------------------------------------------------
	it("should initialize with a mapping file defined!", function(){
		assert.doesNotThrow(function(){ new Translator('openurl'); });
	});
	
// ------------------------------------------------------------------------------------------------------
// translateKey() Tests
// ------------------------------------------------------------------------------------------------------
	it("translations should return the same value when no mapping file is supplied!", function(){
		var translator = new Translator('');
		
		// Make sure that the translator returns the same value if there was no match
		assert.equal('foo', translator.translateKey('foo'));
		assert.equal(translator.translateKey('rft.genre'), 'rft.genre');
		
		assert.notEqual(translator.translateKey('foo'), 'bar');
		assert.notEqual(translator.translateKey('genre'), 'rft.genre');
	});
	
	// ------------------------------------------------------------------------------------------------------
	it("openURL translations should return correct value specified in yaml config!", function(){
		var translator = new Translator('openurl');
		
		_.forEach(CONFIGS['openurl'], function(externalName, internalName){
		
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
// translateMap() Tests
// ------------------------------------------------------------------------------------------------------
	it("translating an entire map when no mapping file was supplied should return the original map!", function(){
		var translator = new Translator('');
		var mapIn = {'foo': 'bar', 'abc': '123'};
		
		var mapOut = translator.translateMap(mapIn);
		
		_.forEach(mapOut, function(value, key){
			assert.equal(mapIn[key],value); 
		});
		
	});
		
// ------------------------------------------------------------------------------------------------------
	it("translating an entire map for openURL should return a translated map!", function(){
		var translator = new Translator('openurl');
		
		var mapIn = {};
		
		_.forEach(CONFIGS['openurl'], function(external, internal){
			// Set the external key = to the internal key names
			if(external instanceof Array){
				_.forEach(external, function(val){
					mapIn[val] = internal;
				});
				
			}else{
				mapIn[external] = internal;
			}
		});
			
		var mapOut = translator.translateMap(mapIn);
			
		_.forEach(mapOut, function(value, key){
			// Make sure the translated keys match the internal names
			assert.equal(value, key);
		});
		
	});
			
});