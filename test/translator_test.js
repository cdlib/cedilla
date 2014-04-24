var CONFIGS = require('../lib/config.js');

var assert = require("assert"),
		_ = require('underscore'),
		helper = require("../lib/helper.js"),
		Translator = require("../lib/translator.js"),
		Item = require("../lib/item.js");


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
	it("translations should return same value when no mapping file is supplied!", function(){
		var translator = new Translator('');
		
		// Make sure that the translator returns the same value if there was no match
		assert.equal('foo', translator.translateKey('item', 'foo'));
		assert.equal(translator.translateKey('item', 'rft.genre'), 'rft.genre');
		
		assert.notEqual(translator.translateKey('item', 'foo'), 'bar');
		assert.notEqual(translator.translateKey('item', 'genre'), 'rft.genre');
	});
	
	// ------------------------------------------------------------------------------------------------------
	it("openURL translations should return correct value specified in yaml config!", function(){
		var translator = new Translator('openurl');
		
		_.forEach(CONFIGS['openurl'], function(map, type){
			_.forEach(map, function(externalName, internalName){
			
				if(externalName instanceof Array){
					// Make sure the translator matches each external name to the same internal name
					_.forEach(externalName, function(name){
						assert.equal(translator.translateKey(type, name), internalName);
					});
				
				}else{
					// Make sure the translator matches the external name to the internal name
					assert.equal(translator.translateKey(type, externalName), internalName);
				}
			
				// Make sure the translator sends back the first external value when passed the internal name
				assert(_.contains(externalName, translator.translateKey(type, internalName)));
			});
		});
		
		// Make sure that the translator returns the same value if there was no match
		assert.equal(translator.translateKey('item', 'foo'), 'foo');
	});
	

// ------------------------------------------------------------------------------------------------------
// mapToItem() Tests
// ------------------------------------------------------------------------------------------------------
	it("mapping to an undefined item should fail!", function(){
		var translator = new Translator('');
		
		// Test undefined item type throws error
		try{
			translator.mapToItem('foo', false, {}, false);
			
			// We didn't get an error, so force a failure
			assert.equal('', helper.buildMessage(CONFIGS['message']['undefined_item_type'], ['foo'])); 
			
		}catch(e){
			// Make sure the error message is correct
			assert.equal(helper.buildMessage(CONFIGS['message']['undefined_item_type'], ['foo']), e.message);
		}
		
	});
			
	// ------------------------------------------------------------------------------------------------------
	it("should return an empty item when no param map is specified and no defaults allowed!", function(){
		var translator = new Translator('');
		
		// Test no param map returns empty Item
		_.forEach(CONFIGS['data']['objects'], function(def, type){
			var obj = translator.mapToItem(type, false, {}, false);
			
			assert.equal(type, obj.getType());
			assert.equal(0, _.size(obj.getAttributes()));
		});
		
	});
			
	// ------------------------------------------------------------------------------------------------------	
	it("should return an item with the specified param map as attributes!", function(){
		var translator = new Translator('');
		
		_.forEach(CONFIGS['data']['objects'], function(def, type){
			var obj = translator.mapToItem(type, false, {"genre":"journal", "rft.title":"My Book", "foo":"bar", "abc":"123",
																											"authors":[{"rft.aulast":"Doe"},{"last_name":"Smith"}]}, false);
			
			assert.equal(type, obj.getType());
			assert.equal(5, _.size(obj.getAttributes()));
			assert.equal("journal", obj.getAttribute("genre"));
			assert.equal("My Book", obj.getAttribute("rft.title"));
			assert.equal("bar", obj.getAttribute("foo"));
			assert.equal("123", obj.getAttribute("abc"));
			
			assert(obj.hasAttribute("authors"));
			assert.equal(2, _.size(obj.getAttribute("authors")));
			
			_.forEach(obj.getAttribute("authors"), function(author){
				assert(author.getAttribute("rft.aulast") == "Doe" || author.getAttribute("last_name") == "Smith");
			});
		});
	});
		
	// ------------------------------------------------------------------------------------------------------
	it("OpenURL should return an item with the translated attributes!", function(){
		var translator = new Translator('openurl');
		
		_.forEach(CONFIGS['openurl'], function(map, type){
			var internals = [],
			    externals = [],
					attributes = {};
			
			// Collect the keys
			_.forEach(map, function(external, internal){
				internals.push(internal);
				
				if(typeof external == 'string'){
					attributes[external] = 'foo_' + internal;
				}else{
					attributes[_.first(external)] = 'foo_' + internal;
				}
			});
			
			var obj = translator.mapToItem(type, false, attributes, true);
			
			assert.equal(type, obj.getType());
			assert.equal(_.size(attributes), _.size(obj.getAttributes()));
			
			_.forEach(internals, function(item){
				assert.equal('foo_' + item, obj.getAttribute(item));
			});
		});
		
	});

// ------------------------------------------------------------------------------------------------------
// itemToMap() Tests
// ------------------------------------------------------------------------------------------------------
	it("should return a map containing the item type and no attributes!", function(){
		var translator = new Translator('');
		
		_.forEach(CONFIGS['data']['objects'], function(def, type){
			
			var map = translator.itemToMap(new Item(type, false, {}));
			
			assert(typeof map != 'undefined');
			assert.equal(0, _.size(map));
		});
	});

	// -----------------------------------------------------------------------------------------------
	it("should return a map of the item!", function(){
		var translator = new Translator('');
		
		_.forEach(CONFIGS['data']['objects'], function(def, type){
			var item = new Item(type, false, attributes);
			var i = _.size(attributes);
			
			_.forEach(def['children'], function(child){
				item.addAttribute(child + 's', [new Item(child, false, {"value1":"abc", "value2":"123"}), 
																				new Item(child, false, {"value1":"xyz", "value2":"987"})]);
				i++;
			});
			
			var map = translator.itemToMap(item, true);
			
			assert(typeof map != 'undefined');
			assert.equal(i, _.size(map));
			assert.equal("fish", map["red"]);
			
			_.forEach(def['children'], function(child){
				assert.equal(2, _.size(map[child + 's']));
				assert.equal("abc", _.first(map[child + 's'])["value1"]);
				assert.equal("987", _.last(map[child + 's'])["value2"]);
			});
		});
	});
	
	// -----------------------------------------------------------------------------------------------
	it("OpenURL should return a map of the translated items!", function(){
		var translator = new Translator('openurl');
		var attributes = {};
		
		// Add each attribute from the openURL mapping file to the item
		_.forEach(CONFIGS['openurl'], function(map, type){
			_.forEach(map, function(externalName, internalName){
				attributes[internalName] = "foo_" + internalName;
			});
		
			var item = new Item(type, false, attributes);			
			var map = translator.itemToMap(item, true);

			assert(typeof map != 'undefined');
			assert.equal(_.size(attributes), _.size(map));

		});
		
	});
	
	
// ------------------------------------------------------------------------------------------------------
// itemToJSON() Tests
// ------------------------------------------------------------------------------------------------------
	it("should return valid JSON", function(){
		var translator = new Translator('');
		
		_.forEach(CONFIGS['data']['objects'], function(def, type){
			var item = new Item(type, false, attributes);
			
			var json = translator.itemToJSON(item);
			
			item.getAttributes().forEach(function(value, key){
				assert(json.indexOf('"' + key + '":"' + value + '"') > 0);
			});
			
		});
	});
	
});
