var Map = require('collections/map'),
		_ = require('underscore'),
		Encoder = require('node-html-encoder').Encoder,
		configManager = require('../config/config.js'),
		helper = require('./helper.js'),
		Item = require('./item.js');

/* -----------------------------------------------------------------------------------------------
 * TRANSLATOR
 *
 * This object works in conjunction with a YAML mapping file to convert attribute names from an
 * external source to generic names recognized by this program.
 * ----------------------------------------------------------------------------------------------- 
 */
var Translator = function(translatorName){
	
	var _externalToInternal = new Map;
	var _internalToExternal = new Map;

	var messages = undefined;

	configManager.getConfig('message', function(config){
		messages = config;
	});

	if(typeof translatorName != 'undefined'){
		if(translatorName.toString().trim() != ''){
			
			configManager.getConfig(translatorName, function(config){
				// Flatten the yaml mapping file into a Map for each direction
				initialize(config);
				
				// If the externalToInternal map is empty then the mapping file did not load and initialize!
				if(_.size(_externalToInternal) <= 0){
					throw new Error(helper.buildMessage(messages['missing_translator_mapping_file'], [translatorName]));
				}
			});
			
		}
	}
	
	// -----------------------------------------------------------------------------------------------
	this.translateKey = function(type, key){ return translateKey(type, key); };
	
	// -----------------------------------------------------------------------------------------------
	this.itemToJSON = function(item){
		var map = this.itemToMap(item, false);
		return this.mapToJSON(map);
	}
	
	// -----------------------------------------------------------------------------------------------
	this.mapToJSON = function(map){
		var ret = "{",
				self = this,
				encoder = new Encoder();
		
		_.forEach(map, function(value, key){
			ret += (ret != '{') ? ',' : '';
			
			if(typeof value == 'string'){
				ret += '"' + encoder.htmlEncode(key) + '":"' + encoder.htmlEncode(value) + '"';
				
			}else{
				ret += '"' + encoder.htmlEncode(key) + '":[';
				
				_.forEach(value, function(child){
					ret += self.mapToJSON(child);
				});
				
				ret += ']';
				
			}
		});
		
		return ret += "}";
	}
	
	// -----------------------------------------------------------------------------------------------
	this.mapToItem = function(type, assignDefaults, map, skipIfMappedToAnotherType){ 
		var itemDefintions = undefined,
				attributes = new Map(),
				children = new Map(),
				self = this;
		
		_.forEach(map, function(value, key){
			if(!skipIfMappedToAnotherType || (skipIfMappedToAnotherType && !mappedToAnotherType(type, key))){
				if(translateKey(type, key) != undefined){
					key = translateKey(type, key);
				}
			
				// If the value is an array then we have children so process them individually
				if(typeof value != 'string'){
					var sibs = [];
				
					_.forEach(value, function(child){
						sibs.push(self.mapToItem(helper.depluralize(key), assignDefaults, child, skipIfMappedToAnotherType));
					});
				
					// Attach the sibling array to the child map
					children.set(key, sibs);
				
				}else{
					attributes.set(key, value);			
				}
			}
		});
		
		// Add any children that were found
		attributes.addEach(children);
		
		return new Item(type, assignDefaults, attributes); 
	};

	// -----------------------------------------------------------------------------------------------
	this.itemToMap = function(item){ return itemToMap(item, true); }
	
	// -----------------------------------------------------------------------------------------------
	this.itemToMap = function(item, includeChildren){
		var ret = {},
				attributeMap = {},
				self = this;
		
		item.getAttributes().forEach(function(value, key){
			if(typeof value == 'string'){
				attributeMap[translateKey(item.getType(), key)] = value;
			
			}else{
				if(includeChildren){
					// Otherwise the item is a collection of child items so process each one accordingly
					var sibs = [];
				
					_.forEach(value, function(child){
						sibs.push(self.itemToMap(child));
					});
				
					attributeMap[translateKey(item.getType(), key)] = sibs;
				}
			}
		});
		
		return attributeMap;
	};

	// -----------------------------------------------------------------------------------------------
	function initialize(config){
		_.forEach(config, function(mappings, itemType){
			var iToE = new Map(),
					eToI = new Map();
			
			// If we already have some mappings for the item, grab them
			if(typeof _externalToInternal[itemType] != 'undefined'){
				iToE = _internalToExternal.get(itemType);
				eToI = _externalToInternal.get(itemType);
			}
			
			_.forEach(mappings, function(externalName, internalName){
			
				if(typeof externalName == 'string'){
					eToI.set(externalName, internalName);
				
					if(!iToE.has(internalName)){
						iToE.set(internalName, externalName);
					}
			
				}else{
					_.forEach(externalName, function(name){
						eToI.set(name, internalName);
					
						if(!iToE.has(internalName)){
							iToE.set(internalName, name);
						}
					});
				}
			});
			
			_internalToExternal.set(itemType, iToE);
			_externalToInternal.set(itemType, eToI);
		});
		
		
	}
	
	// -----------------------------------------------------------------------------------------------
	function translateKey(type, key){
		// Search for a match in both Maps. If none is available just return the key specified
		if(typeof _externalToInternal.get(type) != 'undefined'){
			return (_externalToInternal.get(type).has(key) ? _externalToInternal.get(type).get(key) : 
																									(_internalToExternal.get(type).has(key) ? _internalToExternal.get(type).get(key) : key));
		}else{
			return key;
		}
	}
	
	// -----------------------------------------------------------------------------------------------
	function mappedToAnotherType(type, key){
		// Determine if the specified key is mapped in any of the other mapping definitions
		var ret = false;
		_externalToInternal.forEach(function(map, itemType){
			if(itemType != type){
				ret = (key != translateKey(itemType, key));
			}
		});
		return ret;
	}

}

module.exports = Translator;