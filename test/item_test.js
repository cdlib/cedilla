var assert = require("assert"),
		_ = require('underscore'),
		helper = require("../lib/helper.js"),
		Item = require("../lib/item.js");
				
describe('item.js', function(){
	var configManager = undefined,
			itemDefinitions = undefined,
			attributes = {'foo':'bar', 'one':'fish', 'two':'fish', 'red':'fish', 'blue':'fish'};
	
	// ---------------------------------------------------------------------------------------------------
	before(function(done){
		configManager = require("../config/config.js")
		
		// Call the configManager for the first time so that the yaml files get loaded
		configManager.getConfig('data', function(config){	
			itemDefinitions = config['objects'];	
			done();
		});
	});
	
// ------------------------------------------------------------------------------------------------------	
// Initialization
// ------------------------------------------------------------------------------------------------------
	// Missing type throws error
	it('should throw an error when the type is not specified!', function(){
		assert.throws(function(){ new Item(undefined, false, {}); });
	});
		
	// ------------------------------------------------------------------------------------------------------
	// Invalid type throws error
	it('should throw an error when the type is not defined in the ./config/data.config!', function(){
		assert.throws(function(){ new Item(undefined, false, {}); });
	});
	
	// ------------------------------------------------------------------------------------------------------	
	// Valid item types do NOT throw errors
	it('should NOT throw an error when the type is defined in the ./config/data.config!', function(){
		_.forEach(itemDefinitions, function(def, type){
			assert.doesNotThrow(function(){ new Item(type, false, {}); });
			assert.doesNotThrow(function(){ new Item(type, true, {}); });
			assert.doesNotThrow(function(){ new Item(type, false, attributes); });
			assert.doesNotThrow(function(){ new Item(type, true, attributes); });
		});
	});

	// ------------------------------------------------------------------------------------------------------	
	// defaults off returns empty object
	it('should have no attributes when defaults are turned off and no attributes were supplied!', function(){
		_.forEach(itemDefinitions, function(def, type){
			var item = new Item(type, false, {});
			assert.equal(0, _.size(item.getAttributes()));
		});
	});
	
	// ------------------------------------------------------------------------------------------------------		
	// defaults on returns object with only defaults
	it('should have an attribute for each default defined in ./config/data.yaml!', function(){
		_.forEach(itemDefinitions, function(def, type){
		
			var item = new Item(type, true, {});
			
			if(typeof def['default'] != 'undefined'){
				assert.equal(_.size(def['default']), _.size(item.getAttributes()));
				
				_.forEach(def['default'], function(value, key){
					assert.equal(value, item.getAttribute(key));
				});
			}
			
		});
	});
		
	// ------------------------------------------------------------------------------------------------------	
	// attribute assignment working
	it('should have an attribute for each attribute specified!', function(){
		_.forEach(itemDefinitions, function(def, type){
			var item = new Item(type, false, attributes);
			
			assert.equal(_.size(attributes), _.size(item.getAttributes()));
				
			_.forEach(attributes, function(value, key){
				assert.equal(value, item.getAttribute(key));
			});
		});
	});
		
	
// ------------------------------------------------------------------------------------------------------	
// IsValid()
// ------------------------------------------------------------------------------------------------------
	it('testing for invalid items', function(){
		_.forEach(itemDefinitions, function(def, type){
			if(typeof def['validation'] != 'undefined'){
				var item = new Item(type, true, {});
				
				// Assert that not setting ANY of the validation attributes fails
				assert(!item.isValid());
			}
		});
	});
		
	// ------------------------------------------------------------------------------------------------------	
	it('testing for valid items', function(){
		_.forEach(itemDefinitions, function(def, type){
			var attributes = {};
			
			// Set a value for each attribute defined in the items validation config
			if(typeof def['validation'] != 'undefined'){
				_.forEach(def['validation'], function(attr){
					if(attr instanceof Array){
						_.forEach(attr, function(a){
							attributes[a] = 'bar';
						});
					
					}else{
						attributes[attr] = 'foo';
					}
				});
			}
			
			var item = new Item(type, true, attributes);
			
			assert(item.isValid());
		});
	});
	
// ------------------------------------------------------------------------------------------------------
// Attribute Methods
// ------------------------------------------------------------------------------------------------------
	// has attributes
	it('testing hasAttributes()', function(){
		_.forEach(itemDefinitions, function(def, type){
			var item = new Item(type, false, attributes);
			
			assert(_.size(item.getAttributes()) > 0);
			assert(_.size(item.getAttributes()) == 5);
		});
	});
	
	// ------------------------------------------------------------------------------------------------------
	// has attribute
	it('testing hasAttribute()', function(){
		_.forEach(itemDefinitions, function(def, type){
			var item = new Item(type, false, attributes);
			
			assert(item.hasAttribute('foo'));
			assert(item.hasAttribute('one'));
			assert(item.hasAttribute('two'));
			assert(item.hasAttribute('red'));
			assert(item.hasAttribute('blue'));
		
			assert(!item.hasAttribute('bar'));
		});
	});
	
	// ------------------------------------------------------------------------------------------------------		
	// add attribute
	it('testing addAttribute()', function(){
		_.forEach(itemDefinitions, function(def, type){
			var item = new Item(type, false, attributes);
			
			item.addAttribute('new', 'one');

			assert(item.hasAttribute('new'));
			assert(item.getAttribute('new') == 'one');
		});
	});
			
	// ------------------------------------------------------------------------------------------------------
	// set attributes in bulk
	it('testing addAttributes()', function(){
		_.forEach(itemDefinitions, function(def, type){
			var item = new Item(type, false, attributes);
			
			item.addAttributes({'a':'z', 'b':'y', 'c':'x'});
	
			assert(item.getAttribute('a') == 'z');
			assert(item.getAttribute('b') == 'y');
			assert(item.getAttribute('c') == 'x');
		});
	});
		
	// ------------------------------------------------------------------------------------------------------
	// remove attribute
	it('testing removeAttribute()', function(){
		_.forEach(itemDefinitions, function(def, type){
			var item = new Item(type, false, attributes);
			
			item.removeAttribute('red');
	
			assert(!item.hasAttribute('red'));
			assert(typeof item.getAttribute('red') == 'undefined');
		});
	});
		
	// ------------------------------------------------------------------------------------------------------
	// get value
	it('testing getAttribute()', function(){
		_.forEach(itemDefinitions, function(def, type){
			var item = new Item(type, false, attributes);
			
			assert(item.getAttribute('foo') == 'bar');
			assert(item.getAttribute('one') == 'fish');
			assert(item.getAttribute('two') == 'fish');
			assert(item.getAttribute('red') == 'fish');
			assert(item.getAttribute('blue') == 'fish');
		
			assert(typeof item.getAttribute('bar') == 'undefined');
		});
	});
		
	// ------------------------------------------------------------------------------------------------------
	// check adding child items
	it('testing addAttribute() and removeAttribute() for array of child items', function(){
		var defs = itemDefinitions;
		
		_.forEach(itemDefinitions, function(def, type){
			if(typeof def['children'] != 'undefined'){
				var item = new Item(type, false, attributes);
				var children = [];
			
				var i = 0;
				_.forEach(def['children'], function(child){
					children[i] = new Item(child, true, {'nimble':'jack','frost':'jack','trades':'jack','id':i});
				});
				
				item.addAttribute('children', children);
		
				assert(item.hasAttribute('children'));

				children = item.getAttribute('children');
		
				assert.equal(i + 1, _.size(children));
		
				_.forEach(children, function(child){
					assert(_.size(child.getAttributes()) == 4);
					assert(child.getAttribute('frost') == 'jack');
				});
		
				item.removeAttribute('children');
		
				assert(!item.hasAttribute('children'));
			}
		});
	});
		
	
// ------------------------------------------------------------------------------------------------------
// to String
// ------------------------------------------------------------------------------------------------------
	it('testing toString()', function(){
		_.forEach(itemDefinitions, function(def, type){
			var item = new Item(type, false, attributes);
		
			assert(item.toString() == '"foo" = "bar", "one" = "fish", "two" = "fish", "red" = "fish", "blue" = "fish"');
		});
	});

});