var helper = require('./helper.js'),
		Map = require('collections/map'),
		_ = require('underscore');

/* -----------------------------------------------------------------------------------------------
 * Object/Model
 #
 # Object validation and relationships are stored in the ./config/data.yaml file.
 #
 # Since this aggregator does not really care what information is contained within an object we
 # use very generic objects here to represent whatever item the system is aggregating. The service
 # endpoints and client application should validate and work with the objects as necessary
 * ----------------------------------------------------------------------------------------------- 
 */
var Item = function(type, itemDefinitions, assignDefaults, attributes) {
	this._type = type;
	this._attributes = new Map();
	
	// Load the object definition
	this._definition = itemDefinitions[type];
	
	// Load the attributes
	if(attributes instanceof Map){
		this._attributes.addEach(attributes);
		
	}else if(_.size(attributes) > 0){
		_.forEach(attributes, function(value, key){
			this._attributes.set(key, value);
		})
	}
	
	
	if(typeof assignDefaults == 'undefined'){
		assignDefaults = false;
	}
	
	if(assignDefaults){
		// Set any defaults that have been defined if there is no existing value
		if(this._definition['default'] != undefined){
			var attrs = this._attributes;
		
			_.forEach(this._definition['default'], function(value, key){
				if(!attrs.has(key)){
					attrs.set(key, value);
				}
			});
		
			if(_.size(attrs) > 0){
				this._attributes.addEach(attrs);
			}
		}
	}
	
	// -----------------------------------------------------------------------------------------------
	this.getType = function(){ return this._type; };
	
	// -----------------------------------------------------------------------------------------------
	this.isValid = function(){ 
		var ret = true;
		var attrs = this._attributes;
		
		if(this._definition['validation'] != undefined){
			
			// Loop through the items in the list, these are 'AND' rules
			_.forEach(this._definition['validation'], function(andRule){
				
				// Don't do any further tests if we've already failed!
				if(ret){
					// If the rule is an array of values
					if(_.isArray(andRule)){
						var valid = false;
						
						// Loop through those values and treat them as an 'OR' test
						_.forEach(andRule, function(orRule){
							// If one of the items is present then the test passed
							if(attrs.has(orRule)){
								valid = true;
							}
						});
						
						ret = valid;
					
					}else{
						// Otherwise there is only one value so make sure it exists
						if(!attrs.has(andRule)){
							ret = false;
						}
					}
				}
			});
		}
		return ret;
	};
	
	// -----------------------------------------------------------------------------------------------
	this.addAttribute = function(key, value){ this._attributes.set(key, value); };
	// -----------------------------------------------------------------------------------------------
	this.removeAttribute = function(key){ this._attributes.delete(key); };
	// -----------------------------------------------------------------------------------------------
	this.hasAttributes = function(){ return _.size(this._attributes) > 0; };
	// -----------------------------------------------------------------------------------------------
	this.getAttributes = function(){ return this._attributes; };
	// -----------------------------------------------------------------------------------------------
	this.setAttributes = function(attributes){ 
		if(attributes instanceof Map){
			this._attributes.addEach(attributes); 
		}
	}; 
	// -----------------------------------------------------------------------------------------------
	this.getValue = function(key){ return this._attributes.get(key); };
	// -----------------------------------------------------------------------------------------------
	this.hasAttribute = function(key){ return this._attributes.get(key); };
	
	// -----------------------------------------------------------------------------------------------
	this.toString = function(){ 
		var ret = "";
		this._attributes.forEach(function(value, key){
			if(_.isArray(value)){
				ret += '"' + key + '" = [';
				_.forEach(value, function(child){
					ret += '{' + child.toString() + '}, ';
				});
				ret = ret.slice(0, -2) +  '], ';
			
			}else{
				ret += '"' + key + '" = "' + value + '", ';
			}
		});
		return ret.slice(0, -2);
	}
	
	// -----------------------------------------------------------------------------------------------
	this.toJSON = function(service){
		var attrs = {};
		// Loop through the object's attributes
		this._attributes.entries().forEach(function(entry, index){
			
			// If the attribute is NOT an array just output the value otherwise process the children
			if(!_.isArray(entry[1])){
				attrs[entry[0]] = entry[1];
				
			}else{
				attrs[entry[0]] = childrenToJSON(entry[1]);
			}
		});
		
		// Build out the item's JSON header attributes
		var now = new Date();
		var json = {time: now.toJSON().toString(), service: service.toString()};
		json[this._type] = attrs;
								 
		return JSON.stringify(json);
	}
	
	// -----------------------------------------------------------------------------------------------
	this.addAttributesFromJSON = function(json){
		if(typeof assignDefaults == 'undefined'){
			assignDefaults = false;
		}
		
		if(typeof json == 'string'){
			json = JSON.parse(string);
		}
		var attrs = new Map();
		
		// Loop through the object's attributes
		_.forEach(json, function(value, key){
			// If the attribute is NOT an array grab its value otherwise process it as an array
			if(!_.isArray(value)){
				attrs.set(key, value);
			
			}else{
				attrs.set(key, childrenFromJSON(key.slice(0, -1), value));
			}
		});
		
		// Doing this because for the callback above has no knowledge of this._attributes
		this._attributes.addEach(attrs);
	}
	
	// -----------------------------------------------------------------------------------------------
	function childrenToJSON(children){
		var ret = [];
		
		// Loop through the array of children
		_.forEach(children, function(child){
//			var attrs = {};
			// Loop through the child's attributes and add them to the JSON
//			_.forEach(child.getAttributes().entries(), function(entry, index){
//				attrs[entry[0]] = entry[1];
//			});
			
			// If there were attribute add the child to the JSON
//			if(_.size(attrs) > 0){
//				ret.push(attrs);
//			}
	
			ret[child[0]] = child[1];

		});
		
		return ret;
	}
	
	// -----------------------------------------------------------------------------------------------
	function childrenFromJSON(type, json){
		var ret = [];
		
		// Loop through the array of children
		_.forEach(json, function(entry){
			var item = new Item(type, {});
			
			// Loop through the child's attributes and add them
			_.forEach(entry, function(value, key){
				item.addAttribute(key, value);
			});
			
			// If the item validates add it!
			if(item.isValid()){
				ret.push(item);
			}
		});
		
		return ret;
	}
	
};

module.exports = Item;

