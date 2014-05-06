var CONFIGS = require('./config.js');

var helper = require('./helper.js'),
		Translator = require('./translator.js'),
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
	var _type = '';
	var _attributes = {};
	
	this._translator = new Translator('');
	
	if(typeof type == 'string' && typeof CONFIGS['data']['objects'][type] != 'undefined'){
		this._config = CONFIGS['data']['objects'][type];
		
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
		var self = this;
		_.forEach(attributes, function(value, key){
			self.addAttribute(key, value);
		});
}; 

// -----------------------------------------------------------------------------------------------
Item.prototype.hasAttribute = function(key){ return (typeof this._attributes[key] != 'undefined'); };
// -----------------------------------------------------------------------------------------------
Item.prototype.getAttribute = function(key){ return this._attributes[key]; };
// -----------------------------------------------------------------------------------------------
Item.prototype.addAttribute = function(key, value){ 
	if(_.contains(this._config['attributes'], key)){
		
console.log(key + ' - ' + value + ' ==> ' + this._translator.translateItemAttribute(key, value));

		this._attributes[key] = this._translator.translateItemAttribute(key, value);
		
	}else{
		if(value instanceof Array){
			this._attributes[key] = value;
			
		}else{
			if(typeof this._attributes['additional'] == 'undefined'){
				this._attributes['additional'] = [];
			}
			
			var hash = {};
			hash[key] = value;
			this._attributes['additional'].push(hash);
		}
	}
};
// -----------------------------------------------------------------------------------------------
Item.prototype.removeAttribute = function(key){ delete this._attributes[key]; }; 
	
// -----------------------------------------------------------------------------------------------
Item.prototype.toString = function(){ 
	var ret = "";
//	this._attributes.forEach(function(value, key){
	_.forEach(this._attributes, function(value, key){
		
		if(_.size(value) > 0 && value instanceof Array){
			
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
		self._attributes = {}; //new Map(); 
	}

	self.addAttributes(attributes);

	// -------------------------------------------------
	if(typeof assignDefaults != 'boolean'){
		assignDefaults = false;
	}

	// Assign the defaults if applicable
	if(assignDefaults){
		// Set any defaults that have been defined if there is no existing value
		if(self._config['default'] != undefined){
			
			_.forEach(self._config['default'], function(value, key){
				if(!self.hasAttribute(key)){
					self.addAttribute(key, value);
				}
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
						if(typeof attrs[orRule] != 'undefined'){
							valid = true;
						}
					});
					
					ret = valid;
				
				}else{
					// Otherwise there is only one value so make sure it exists
					if(typeof attrs[andRule] == 'undefined'){
						ret = false;
					}
				}
			}
		});
	}
	return ret;
};

// -----------------------------------------------------------------------------------------------
module.exports = Item;

