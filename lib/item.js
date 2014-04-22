var CONFIGS = require('./config.js');

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
var Item = function(type, assignDefaults, attributes) {
	// Make sure the item type was assigned and that it is defined in the config
//	this._definition = undefined;
	var _type = '';
	var _attributes = new Map();
	
	if(typeof type == 'string' && typeof CONFIGS['data']['objects'][type] != 'undefined'){
		this._initialize(type, assignDefaults, attributes);
		
	}else{
		throw new Error(helper.buildMessage(CONFIGS['message']['undefined_item_type'], [type]));
	}
};

// -----------------------------------------------------------------------------------------------
Item.prototype.getType = function(){ return this._type; };
	
// -----------------------------------------------------------------------------------------------
Item.prototype.hasAttributes = function(){ return _.size(this._attributes) > 0; };
// -----------------------------------------------------------------------------------------------
Item.prototype.getAttributes = function(){ return this._attributes; };
// -----------------------------------------------------------------------------------------------
Item.prototype.addAttributes = function(attributes){ 
	if(attributes instanceof Map){
		this._attributes.addEach(attributes); 
	
	}else{
		var self = this;
		_.forEach(attributes, function(value, key){
			self._attributes.add(value, key);
		});
	}
}; 

// -----------------------------------------------------------------------------------------------
Item.prototype.hasAttribute = function(key){ return this._attributes.get(key); };
// -----------------------------------------------------------------------------------------------
Item.prototype.getAttribute = function(key){ return this._attributes.get(key); };
// -----------------------------------------------------------------------------------------------
Item.prototype.addAttribute = function(key, value){ this._attributes.set(key, value); };
// -----------------------------------------------------------------------------------------------
Item.prototype.removeAttribute = function(key){ this._attributes.delete(key); };
	
// -----------------------------------------------------------------------------------------------
Item.prototype.toString = function(){ 
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
};

// -----------------------------------------------------------------------------------------------
Item.prototype._initialize = function(type, assignDefaults, attributes){
	var self = this;
	
	self._type = type;
	
	if(typeof self._attributes == 'undefined'){ 
		self._attributes = new Map(); 
	}
	
	// Add the attributes
	if(attributes instanceof Map){
		self._attributes.addEach(attributes);

	}else if(_.size(attributes) > 0){
		_.forEach(attributes, function(value, key){
			self._attributes.set(key, value);
		});
	}

	// -------------------------------------------------
	if(typeof assignDefaults != 'boolean'){
		assignDefaults = false;
	}

	// Assign the defaults if applicable
	if(assignDefaults){
		// Set any defaults that have been defined if there is no existing value

		//if(this._definition['default'] != undefined){
		if(CONFIGS['data']['objects'][type]['default'] != undefined){
			
			_.forEach(CONFIGS['data']['objects'][type]['default'], function(value, key){
				self._attributes.set(key, value);
			});
		}
	}
};

// -----------------------------------------------------------------------------------------------
Item.prototype.isValid = function(){
	var self = this;
	var ret = true;
	var attrs = self._attributes;
	
	if(CONFIGS['data']['objects'][self._type]['validation'] != undefined){
		
		// Loop through the items in the list, these are 'AND' rules
		_.forEach(CONFIGS['data']['objects'][self._type]['validation'], function(andRule){
			
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

module.exports = Item;

