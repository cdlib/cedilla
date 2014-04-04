var Map = require('collections/map'),
		_ = require('underscore');

module.exports = {

	// -----------------------------------------------------------------------------------------------
	queryStringToMap: function(queryString){
		var ret = new Map();
		
		if(typeof queryString == 'string'){
			var parts = queryString.replace('?', '').split('&');
			
			for(idx in parts){
				var args = parts[idx].split('=');
				
				if(_.size(args) == 2){
					ret.set(decodeURIComponent(args[0]), decodeURIComponent(args[1]));
				}
			}
		}
		
		return ret;
	},
	
	// -----------------------------------------------------------------------------------------------
	mapToQueryString: function(map){
		var ret = "";
		
		if(map instanceof Map){
			for(item in map){
				ret += (ret.length() > 0 ? '&' : '') + encodeURIComponent(map.key) + '=' + encodeURIComponent(map.val);
			}
		}
		
		return ret;
	},
	
	// -----------------------------------------------------------------------------------------------
	safeAssign: function(valType, val, defaultVal){
		if(val == undefined || typeof val == 'undefined' || val == ''){
			// The val is undefined so return the default
			return defaultVal;
			
		}else{
			if(valType.toLowerCase().trim() == 'string'){
				// The caller is expecting a String so just convert the val to String.
				return val;//.toString();
				
			}else if(typeof val == valType.toLowerCase().trim()){
				// The val is already of the specified type so just return it
				return val;
			
			}else{
				try{
					// Convert the val to the specified type
					return eval(val);
					
				}catch(e){
					// Unable to convert the val to the specified type so return the default
					console.log(e);
					return defaultVal;
				}
				
			}
		}
	}
	
}