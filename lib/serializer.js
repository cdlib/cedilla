var CONFIGS = require('./config.js');

var _ = require('underscore'),
		uuid = require('node-uuid'),
		helper = require('./helper.js'),
		Item = require('./item.js');

module.exports = {
	
	itemToJsonForClient: function(service, item){
		var now = new Date(),
				message = '{"time":"' + now.toJSON() + '",' +
									 '"api_ver":"' + CONFIGS['application']['client_api_version'] + '",' +
				 				   '"service":"' + service + '",';
							
		if(item instanceof Item){	
			message += '"' + item.getType() + '":' + JSON.stringify(helper.itemToMap(item)) + '}';
		}else{
			message += '"error":"' + item.message + '"}';
		}
		
		return JSON.stringify(message);
	},
	
	// -----------------------------------------------------------------------------------------------	
	itemToJsonForService: function(transactionId, item){
		var now = new Date(),
				message = '{"time":"' + now.toJSON() + '",' +
									 '"api_ver":"' + CONFIGS['application']['service_api_version'] + '",' +
									 '"id":"' + transactionId + '",';
		
		if(item instanceof Item){
			var map = helper.itemToMap(item);
			
			message += '"' + item.getType() + '":' + JSON.stringify(map);
			
		}else{
			message += '"' + helper.getRootItemType() + '":{}';
		}
		
		return message + '}';
	},
	
	// -----------------------------------------------------------------------------------------------	
	jsonFromServiceToItem: function(json){
		
	}
	
}