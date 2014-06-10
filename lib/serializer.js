/* -----------------------------------------------------------------------------------------------
 * Serializer: The serializer handles the conversion of item.js objects over to standardized
 *             JSON data that can be sent to a target web service or back to the client.
 * -----------------------------------------------------------------------------------------------
 */

module.exports = {
  
  itemToJsonForClient: function(service, item){
    var now = new Date(),
        message = '{"time":"' + now.toJSON() + '",' +
                   '"api_ver":"' + CONFIGS['application']['client_api_version'] + '",' +
                    '"service":"' + service + '",';
              
    if(item instanceof Item){  
      message += '"' + item.getType() + '":' + JSON.stringify(helper.itemToMap(item)).replace('\"', '"') + '}';
    }else{
      message += '"error":"' + item.message + '"}';
    }
    
    return message;
  },
  
  // -----------------------------------------------------------------------------------------------  
  itemToJsonForService: function(transactionId, item, includeAdditionalAttributes){
    var now = new Date(),
        message = '{"time":"' + now.toJSON() + '",' +
                   '"api_ver":"' + CONFIGS['application']['service_api_version'] + '",' +
                   '"id":"' + transactionId + '",';
    
    if(item instanceof Item){
      var map = helper.itemToMap(item);

      // Strip out the 'additional' attributes catch-all unless the service wants it
      if(!includeAdditionalAttributes){
        map['additional'] = [];
      }

      message += '"' + item.getType() + '":' + JSON.stringify(map).replace('\"', '"');
      
    }else{
      message += '"' + helper.getRootItemType() + '":{}';
    }
    
    return message + '}';
  }
  
}
