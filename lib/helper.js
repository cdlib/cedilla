var CONFIGS = require('./config.js');

var querystring = require('querystring'),
		_ = require('underscore'),
		Item = require('./item.js');

module.exports = {
	
	// -----------------------------------------------------------------------------------------------
	safeAssign: function(valType, val, defaultVal){
		if(val == undefined || typeof val == 'undefined'){ 
			// The val is undefined so return the default
			return defaultVal;
			
		}else{
			if(valType.toLowerCase().trim() == 'string'){
				// The caller is expecting a String so just convert the val to String
				return (typeof val == 'string') ? (val.trim() == '') ? defaultVal : val : val.toString();
				
			}else if(typeof val == valType.toLowerCase().trim()){
				// The val is already of the specified type so just return it
				return val;
			
			}else{
				try{
					// Convert the val to the specified type
					return eval(val);
					
				}catch(e){
					// Unable to convert the val to the specified type so return the default
					return defaultVal;
				}
				
			}
		}
	},

	// -----------------------------------------------------------------------------------------------
	buildMessage: function(message, values){
		if(typeof message == 'string' && values instanceof Array){
			_.forEach(values, function(value){
				message = message.replace(/\?/, "'" + value.toString() + "'");
			});
		}
		
		return message;
	},
	
	// -----------------------------------------------------------------------------------------------
	depluralize: function(value){
		var ret = value.toString();
		
		if(value[value.length - 1] == 's'){
			var ret = (value.substring(value.length - 3) == 'ies') ? ret.substring(0, ret.length - 3) + 'y' : ret.substring(0, ret.length - 1);
		
		}else{
			if(value[value.length - 1] == 'i'){
				// Ends in 'i' likely so default to 'us' octopi -> octopus, magi -> magus, loci -> locus (GOOD ENOUGH!)
				ret = ret.substring(0, ret.length - 1) + "us";
			}
		}

		return ret;
	},
	
	// -----------------------------------------------------------------------------------------------	
	queryStringToMap: function(queryString){
		return querystring.parse(queryString);
	},
	
	// -----------------------------------------------------------------------------------------------	
	mapToQueryString: function(map){
		return querystring.stringify(map);
	},
	
	// -----------------------------------------------------------------------------------------------	
	itemToMap: function(item){
		var ret = {},
				self = this;
		
		
console.log(typeof Item);
console.log(item.getType());		
		
		if(item instanceof Item){
			
			_.forEach(item.getAttributes(), function(value, key){
				
				if(value instanceof Array){
					if(_.size(value) > 0){
						var children = [];
					
						_.forEach(value, function(child){
							if(child instanceof Item){
								children.push(self.itemToMap(child));
							
							}else{
								children.push(child);
							}
						});
					
						ret[key] = children;
					}
					
				}else{
					ret[key] = value;
				}
				
			});
		}
		
		return ret;
	},
	
	// -----------------------------------------------------------------------------------------------	
	mapToItem: function(type, assignDefaults, map){
		var attributes = {},
				usedKeys = [],
				self = this;
		
		if(typeof CONFIGS['data']['objects'][type] != 'undefined'){
			
			// If the map was passed in attempt to populate the attributes and children
			if(_.size(map) > 0){
				// Loop through child objects and assign their values if applicable
				// This appropriately builds the object hierarchy when the incoming map is flat (e.g. from a querystring)
				_.forEach(CONFIGS['data']['objects'][type]['children'], function(child){
					if(typeof attributes[child + 's'] == 'undefined'){
						attributes[child + 's'] = [];
					}
				
					var item = self.mapToItem(child, assignDefaults, map);
				
					var atts = item.getAttributes();
				
					if(_.size(item.getAttributes()) > 0){
						attributes[child + 's'].push(item);
			
						// Loop through the attributes that got assigned to the child and add them to the list of used keys
						_.forEach(item.getAttributes(), function(item, idx, attr){
							_.forEach(attr, function(v, k){
								usedKeys.push(k);
							});
						});
					}
				});
			
				// Process the main item type
				_.forEach(map, function(value, key){
					if(value instanceof Array){
						// Initialize the attribute as an array if its not already defined
						if(typeof attributes[key] == 'undefined'){
							attributes[key] = [];
						}
					
						_.forEach(value, function(child){
							// Recursively convert the child to an Item if its a hash map
							if(typeof child != 'string' && _.size(child) > 0){
								
								var item = self.mapToItem(key.slice(0, -1), assignDefaults, child);
							
								if(_.size(item.getAttributes()) > 0){
									attributes[key].push(item);
						
									// Loop through the attributes that got assigned to the child and add them to the list of used keys
									_.forEach(item.getAttributes(), function(v, k){
										usedKeys.push(k);
									});
								}
							
							}else{
								// Otherwise its just an array of strings and not complex objects
								attributes[key].push(child);
								usedKeys.push(key);
							}
						});
					
					}else{
						// If the key is defined as belonging to the item type then set it
						if(_.contains(CONFIGS['data']['objects'][type]['attributes'], key)){
							attributes[key] = value;
							usedKeys.push(key);
						}
					}
				});
			
				// Throw any unused values into the 'additional' hash if this is the root object!
				if(CONFIGS['data']['objects'][type]['root']){
					var additional = [];
				
					_.forEach(map, function(value, key){
						if(!_.contains(usedKeys, key)){
							var hash = {};
							hash[key] = value;
						
							additional.push(hash);
						}
					});
				
					attributes['additional'] = additional;
				}
			
			
//console.log('building kid: ' + type + ' - ' + assignDefaults);
//console.log(attributes);
//console.log(typeof Item);
			
				return new Item(type, assignDefaults, attributes);
		
			}else{
				// The map was empty so generate an empty item
				return new Item(type, assignDefaults, {});
			}
			
		}else{
			throw new Error(self.buildMessage(CONFIGS['message']['undefined_item_type'], [type]));
		}
	},

}