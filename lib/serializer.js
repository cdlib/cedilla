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
  itemToJsonForService: function(transactionId, item, includeAdditionalAttributes, flattenJson){
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
      
      if(flattenJson){
        map = flattenMap(map);
      }

      message += '"' + item.getType() + '":' + JSON.stringify(map).replace('\"', '"');
      
    }else{
      message += '"' + helper.getRootItemType() + '":{}';
    }
    
    return message + '}';
  }
  
}

// -----------------------------------------------------------------------------------------------  
// -----------------------------------------------------------------------------------------------  
function flattenMap(map){
  var ret = {}

  _.forEach(map, function(value, key){
    if(typeof value != 'string'){
      // Its not a string so just grab the first item 
      var it = _.first(value);
      
      if(typeof it != 'undefined'){
        if(typeof it != 'string'){
          // Its a hash so lets call this function recursively to flatten this one
          it = flattenMap(it);
        
          _.forEach(it, function(v,k){
            if(typeof v != 'string'){
              if(_.contains(CONFIGS['data']['objects'][helper.getRootItemType()]['children'], key.slice(0, -1))){
                ret[key.slice(0, -1) + '_' + k] = _.first(v);
              }else{
                ret[key] = _.first(v);
              }
              
            }else{
              if(_.contains(CONFIGS['data']['objects'][helper.getRootItemType()]['children'], key.slice(0, -1))){
                ret[key.slice(0, -1) + '_' + k] = v;
              }else{
                ret[key] = v;
              }
            }
          });
        
        }else{
          // It was just an array of string values so just add the first item to the output
          ret[key] = it;
        }
      }

    }else{
      // Its a string so just add it onto the output as is
      ret[key] = value;
    }
  });

  return ret;

};
