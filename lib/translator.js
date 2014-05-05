var CONFIGS = require('./config.js');

var Map = require('collections/map'),
		_ = require('underscore'),
		querystring = require('querystring'),
		Encoder = require('node-html-encoder').Encoder,
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
	this._externalToInternal = {};
	this._internalToExternal = {};
	
	if(typeof translatorName != 'undefined'){
		if(translatorName.toString().trim() != ''){
			
			this._config = CONFIGS[translatorName];
			
			this._initialize();
			
			// If the externalToInternal map is empty then the mapping file did not load and initialize!
			if(_.size(this._externalToInternal) <= 0){
				throw new Error(helper.buildMessage(CONFIGS['message']['missing_translator_mapping_file'], [translatorName]));
			}

		}
	}
};

// -----------------------------------------------------------------------------------------------
Translator.prototype.translateKey = function(key){
	return typeof this._externalToInternal[key] != 'undefined' ? this._externalToInternal[key] : 
										(typeof this._internalToExternal[key] != 'undefined' ? this._internalToExternal[key] : key);
};


// -----------------------------------------------------------------------------------------------
Translator.prototype.translateMap = function(map){
	var ret = {},
			self = this;
	
	_.forEach(map, function(value, key){
	
		if(value instanceof Array){
			// If the attributes does not have the collection, initialize it
			if(typeof ret[key] == 'undefined'){
				ret[key] = [];
			}
		
			// translate each child and add it onto the attributes
			_.forEach(value, function(child){
				if(child instanceof Hash){
					ret[key].push(self.translateMap(child));
					
				}else{
					// Otherwise its just a collection of values
					ret[key].push(child);
				}
			});
		
		}else{
			// translate the key
			ret[self.translateKey(key)] = value;
		}
	});
	
	return _.size(ret) > 0 ? ret : map;
};

// -----------------------------------------------------------------------------------------------
Translator.prototype._initialize = function(){
	var self = this;
	
	_.forEach(self._config, function(externalName, internalName){
	
		if(typeof externalName == 'string'){
			self._externalToInternal[externalName] = internalName;
		
			if(typeof self._internalToExternal[internalName] == 'undefined'){
				self._internalToExternal[internalName] = externalName;
			}
	
		}else{
			_.forEach(externalName, function(name){
				self._externalToInternal[name] = internalName;
			
				if(typeof self._internalToExternal[internalName] == 'undefined'){
					self._internalToExternal[internalName] = name;
				}
			});
		}
	});
};
	
// -----------------------------------------------------------------------------------------------
module.exports = Translator;