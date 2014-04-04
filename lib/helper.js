module.exports = {
	
	safeAssign: function(val_type, val, default_val){
		if(val == undefined || typeof val == 'undefined' || val == ''){
			// The val is undefined so return the default
			return default_val;
			
		}else{
			if(val_type.toLowerCase().trim() == 'string'){
				// The caller is expecting a String so just convert the val to String.
				return val;//.toString();
				
			}else if(typeof val == val_type.toLowerCase().trim()){
				// The val is already of the specified type so just return it
				return val;
			
			}else{
				try{
					// Convert the val to the specified type
					return eval(val);
					
				}catch(e){
					// Unable to convert the val to the specified type so return the default
					console.log(e);
					return default_val;
				}
				
			}
		}
	}
	
}