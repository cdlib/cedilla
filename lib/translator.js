var Map = require('collections/map'),
		_ = require('underscore'),
		Item = require('./item.js');

/* -----------------------------------------------------------------------------------------------
 * TRANSLATOR
 *
 * This object works in conjunction with a YAML mapping file to convert attribute names from an
 * external source to generic names recognized by this program.
 * ----------------------------------------------------------------------------------------------- 
 */
var Translator = function(configManager, translatorName){
	
	this._configManager = configManager;
	
	var _externalToInternal = new Map;
	var _internalToExternal = new Map;
	
	// Flatten the yaml mapping file into a Map for each direction
	initialize(configManager.getConfig(translatorName));
	
	// -----------------------------------------------------------------------------------------------
	this.translateKey = function(key){ translateKey(key); };
	
	// -----------------------------------------------------------------------------------------------
	this.mapToItem = function(type, assignDefaults, map){ 
		return new Item(type, this._configManager.getConfig('application')['objects'], assignDefaults, mapToEntity(map, type)); 
	};
	
	// -----------------------------------------------------------------------------------------------
	this.citationToMap = function(citation){
	
	};

	// -----------------------------------------------------------------------------------------------
	this.citationToJSON = function(citation){
		var map = this.citationToMap(citation);
		
	};
	
	// -----------------------------------------------------------------------------------------------
	function initialize(config){
		_.forEach(config, function(externalName, internalName){
			
			if(typeof externalName == 'string'){
				_externalToInternal.set(externalName, internalName);
				
				if(!_internalToExternal.has(internalName)){
					_internalToExternal.set(internalName, externalName);
				}
			
			}else{
				_.forEach(externalName, function(name){
					_externalToInternal.set(name, internalName);
					
					if(!_internalToExternal.has(internalName)){
						_internalToExternal.set(internalName, name);
					}
				});
			}
		});
	}
	
	// -----------------------------------------------------------------------------------------------
	function translateKey(key){
		return (_externalToInternal.has(key) ? _externalToInternal.get(key) : _internalToExternal.get(key));
	}
	
	// -----------------------------------------------------------------------------------------------
	function mapToEntity(map, entity_type){
		var attributes = new Map();
		
		map.forEach(function(value, key){
			if(translateKey(key) != undefined){
				key = translateKey(key);
			}
			
			// If this is an entity prefixed item add it to the entity
			if(key.indexOf(entity_type + '_') == 0){
				attributes.set(key.replace(entity_type + '_', ''), value);
				
				// Otherwise its a citation so ignore any author or resource prefixed items
			}else if(entity_type == 'citation' && key.indexOf('author_') != 0 && key.indexOf('resource_') != 0){	
				attributes.set(key, value);
			}
			
		});
		
		return attributes;
	}

}

module.exports = Translator;