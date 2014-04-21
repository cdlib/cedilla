var Map = require('collections/map'),
		_ = require('underscore');

module.exports = {

	// -----------------------------------------------------------------------------------------------
	queryStringToMap: function(queryString){
		var ret = {};

		if(typeof queryString == 'string'){
			var parts = queryString.replace('?', '').split('&');

			for(idx in parts){
				var args = parts[idx].split('=');

				if(_.size(args) == 2){
					ret[decodeURIComponent(args[0])] = decodeURIComponent(args[1]);
				}
			}
		}

		return ret;
	},
	
	// -----------------------------------------------------------------------------------------------
	mapToQueryString: function(map){
		var ret = "",
				self = this;
		
		_.forEach(map, function(value, key){
			if(value instanceof Array){
				_.forEach(value, function(child){
					ret += (ret.length > 0 ? '&' : '') + self.mapToQueryString(child);
				});
			}else{
				ret += (ret.length > 0 ? '&' : '') + encodeURIComponent(key) + '=' + encodeURIComponent(value);
			}
		});
		
		return ret;
	},
	
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
	}
	
}