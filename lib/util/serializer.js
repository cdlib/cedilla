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
  itemToJsonForService: function(transactionId, item, requestorParams){
    var now = new Date(),
        message = '{"time":"' + now.toJSON() + '",' +
                   '"id":"' + transactionId + '"';
                   
    // Add the top level request information
    if(typeof requestorParams['api_ver'] != 'undefined'){ message += ',"api_ver":"' + requestorParams['api_ver'] + '"'; }
    if(typeof requestorParams['referrer'] != 'undefined'){ message += ',"referrer":"' + requestorParams['referrer'] + '"'; }
    if(typeof requestorParams['requestor_ip'] != 'undefined'){ message += ',"requestor_ip":"' + requestorParams['requestor_ip'] + '"'; }
    if(typeof requestorParams['requestor_affiliation'] != 'undefined'){ message += ',"requestor_affiliation":"' + requestorParams['requestor_affiliation'] + '"'; }
    if(typeof requestorParams['unmapped'] != 'undefined'){ message += ',"unmapped":"' + requestorParams['unmapped'] + '"'; }
    
    message += ',';
    
    if(item instanceof Item){
      var map = helper.itemToMap(item);

      message += '"' + item.getType() + '":' + JSON.stringify(map).replace('\"', '"');
      
    }else{
      message += '"' + helper.getRootItemType() + '":{}';
    }
    
    return message + '}';
  },
  

  // -----------------------------------------------------------------------------------------------  
  requestToJson: function(request){
    var message = '{"start_time":"' + request.getStartTime() + '",' +
                  '"end_time":"' + request.getEndTime() + '",' +
                  '"service_api_ver":"' + request.getServiceApiVersion() + '",' +
                  '"client_api_ver":"' + request.getClientApiVersion() + '",' +
                  '"referrer":"' + request.getReferrer() + '",' +
                  '"request_id":"' + request.getId() + '",' +
                  '"requestor_affiliation":"' + request.getAffiliation() + '",' +
                  '"requestor_ip":"' + request.getIp() + '",' +
                  '"requestor_language":"' + request.getLanguage() + '",' +
                  '"requestor_agent":"' + request.getUserAgent() + '",' +
                  '"request_type":"' + request.getType() + '",' +
                  '"unmapped":"' + request.getUnmapped() + '",' +
                  '"request":"' + request.getRequest() + '",';
      
    if(request.hasMappedItems()){            
      message += '"mapped":[';
      _.forEach(request.getMappedItems(), function(item){
        var map = helper.itemToMap(item);
        
        map['type'] = item.getType();
        map['id'] = item.getId();
        
        if(_.size(item.getTransactions()) > 0){
          map['transactions'] = item.getTransactions();
        }
        
        message += (message[message.length - 1] == '[' ? '' : ',') + JSON.stringify(map);//.replace('\"', '"');
      });
      message += '],'
    }
    
    if(request.hasErrors()){            
      message += '"errors":[';
      _.forEach(request.getErrors(), function(err){
        message += (message[message.length - 1] == '[' ? '' : ',') + '"' + err.toString() + '"';
      });
      message += '],'
    }
    
    return message + '"duration":"' + request.getDuration() + '"}';
  }
  
}

// -----------------------------------------------------------------------------------------------  
// -----------------------------------------------------------------------------------------------  
/*function flattenMap(map){
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

};*/
