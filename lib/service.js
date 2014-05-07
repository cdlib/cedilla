var CONFIGS = require('./config.js'),
    LOGGER = require('./logger.js');

var http = require('http'),
    url = require('url'),
    uuid = require('node-uuid'),
    _ = require('underscore'),
    helper = require('./helper.js'),
    serializer = require('./serializer.js'),
    augmenter = require('./augmenter.js'),
    Translator = require('./translator.js'),
    Item = require('./item.js');

/* -----------------------------------------------------------------------------------------------
 * Service
 * ----------------------------------------------------------------------------------------------- 
 */
function Service(name) {
  // Do the initialization  
  if(typeof name == 'string'){
    if(name.trim() != ''){
      this._name = helper.safeAssign('string', name, 'unknown');
  
      var _config = undefined,
          self = this;
      
      // Find the config file for the service
      _.forEach(CONFIGS['services']['tiers'], function(services, tier){
        _.forEach(services, function(config, name){
          if(name == self._name){ _config = config; }
        });
      });
  
      this._displayName = helper.safeAssign('string', _config['display_name'], this._name);
  
      this._enabled = helper.safeAssign('boolean', _config['enabled'], false);
      this._maxAttempts = helper.safeAssign('number', _config['max_attempts'], 1);
      this._timeout = helper.safeAssign('number', _config['timeout'], 30000);
  
      this._target = helper.safeAssign('string', _config['target'], undefined);
  
      this._translator = helper.safeAssign('string', _config['translator'], undefined);
      
    }else{
      throw new Error(helper.buildMessage(CONFIGS['message']['service_no_name']));
    }
  }else{
    throw new Error(helper.buildMessage(CONFIGS['message']['service_no_name']));
  }
  
  // -----------------------------------------------------------------------------------------------
  this.getName = function(){ return this._name; };
  // -----------------------------------------------------------------------------------------------
  this.getDisplayName = function(){ return this._displayName; };
  // -----------------------------------------------------------------------------------------------
  this.isEnabled = function(){ return this._enabled; };
  // -----------------------------------------------------------------------------------------------
  this.toString = function() { return this._name; };
  
  // -----------------------------------------------------------------------------------------------
  this.call = function(item, headers, callback){
    var out = "",
        aborted = false,
        now = new Date(),
        itemOut = new Item(item.getType(), false, {});
        self = this;
        
		this.transactionId = uuid.v4();
  
    var map = helper.itemToMap(item);
            
    if(typeof self._translator != 'undefined'){
      var translator = new Translator(self._translator);
      map = translator.translateMap(map);
    }
  
    itemOut.addAttributes(map);
  
    // Build the JSON post data for the citation
    var data = serializer.itemToJsonForService(this.transactionId, itemOut);
  
    LOGGER.log('info', 'Connecting to ' + this._target + ' :: ' + data);
  
    if(typeof this._target != 'undefined'){
      var destination = url.parse(this._target);
    
      var options = {hostname: destination.hostname,
                     port: destination.port,
                     path: destination.path,
                      method: 'POST',
                     headers: {'Content-Type': 'text/json', 
                                'Content-Length': data.length,
                               'Accept': 'text/json',
                               'Accept-Charset': 'utf-8',
                               'Cache-Control': 'no-cache'}};/*,
                               'Origin': headers['origin'],
                               'Referer': headers['referer'],
                               'User-Agent': headers['user-agent']}};*/
                             
      // Add any headers that were passed in onto the call
      _.forEach(headers, function(value, key){
        options['headers'][key] = value;
      });
                   
									 
			console.log('Reaching out to ' + this._name + ' located on ' + this._target + ' with id ' + this.transactionId);
									 
      var request = http.request(options, function(response){
      
        // ---------------------------------------------------
        response.setEncoding('utf8');
      
        // ---------------------------------------------------
        response.on('data', function(chunk){

          // Limit the response size so we don't ever accidentally get a Buffer overload
          if(out.length > CONFIGS['application']['service_max_response_length']){
            request.abort();
          
            LOGGER.log('error', 'response is too large! aborting connection with ' + self._name + ' :: ' + item.toString());
            LOGGER.log('error', out);
          
            aborted = true
          
            out = 'service_buffer_overflow';
          
          }else{
            out += chunk;
          }
        });
      
        // ---------------------------------------------------
        response.on('end', function(){
          var rslt = undefined;
        
          try{
            if(!aborted){
              switch(response.statusCode){
          
                case 200: // SUCCESS
                  var json = JSON.parse(out);
        
				
				console.log('Receipt back for ' + self._name + ' from ' + self._target + ' with id ' + json['id'] + ' (expected: ' + self.transactionId + ')');
				
				
                  // If the result is for the current request then convert the json to objects
                  if(json['id'] == self.transactionId){
                    if(typeof json[item.getType() + 's'] != 'undefined'){
              
                      //TODO: Need to deal with multiple base level items!
                      rslt = helper.mapToItem(item.getType(), false, json[item.getType() + 's'][0]);

                      augmenter.augmentItem(item, rslt);

                      // If the result is undefined then we received an undefined item type, so throw an error
                      if(typeof rslt == 'undefined'){ 
                        LOGGER.log('error', 'Unable to translate the result for ' + self._name + ' :: ' + item.toString());
                        LOGGER.log('error', json);
                      
                        rslt = new Error(helper.buildMessage(CONFIGS['message']['service_unable_to_translate'], [self._name])); 
                      }
          
                    }else{
                      LOGGER.log('error', 'Undefined item type received for ' + self._name + ' :: ' + item.toString());
                      LOGGER.log('error', json);
                    
                      rslt = new Error(helper.buildMessage(CONFIGS['message']['service_unknown_item'], [self._name])); 
                    }
          
                  }else{
                    LOGGER.log('error', 'Response received was NOT from ' + self._name + ' :: ' + item.toString());
                    LOGGER.log('error', 'Expecting transaction id: ' + transactionId + ' but got: ' + json['id']);
              
                    rslt = new Error(helper.buildMessage(CONFIGS['message']['service_wrong_response'], [self._name]));
                  }
                  break;
            
                case 400: // BAD REQUEST
                  LOGGER.log('error', 'There was a problem with the JSON sent to ' + self._name + ' :: ' + item.toString());
                  LOGGER.log('error', data);
                
                  rslt = new Error(helper.buildMessage(CONFIGS['message']['service_bad_request'], [self._name]));
                  break;
            
                case 404: // NOT FOUND
                  LOGGER.log('debug', self._name + ' service found no results :: ' + item.toString());

                  rslt = helper.mapToItem(item.getType(), false, {});
                  break;
            
                default: // ERROR!!!
                  var json = JSON.parse(out);
                
                  if(json['level'] == 'fatal'){
                    // TODO: Update the service.yaml to bring this service offline and email the service admin and aggregator team
                
                    rslt = new Error(helper.buildMessage(CONFIGS['message']['service_server_error_fatal'], [self._name]));
                
                  }else if(json['level'] == 'error'){
                    // Its an error, pass it on to the client for them to interpret
                    rslt = new Error(helper.buildMessage(CONFIGS['message']['service_server_error'], [self._name]));
                
                  }else{
                    // Send back an empty citation
                    rslt = helper.mapToItem(item.getType(), false, {});
                  }
              
                  break;
              }
            
            }else{
              // The request was aborted during processing
              rslt = new Error(helper.buildMessage(CONFIGS['message'][out], [self._name]));
            }
        
          }catch(e){
            // If its invalid JSON
            if(e.message.indexOf('Unexpected token') >= 0){
              LOGGER.log('error', self._name + ' did not receive valid JSON back from the service :: ' + item.toString());
              LOGGER.log('error', out);
            
              rslt = new Error(helper.buildMessage(CONFIGS['message']['service_bad_json'], [self._name]));
            
            }else{
              LOGGER.log('error', self._name + ' encountered an error while processing the response: ' + e.message + ' :: ' + item.toString());
              LOGGER.log('error', out);
            
              rslt = new Error(helper.buildMessage(CONFIGS['message']['service_server_error'], [self._name]));
            }
          }
        
          LOGGER.log('debug', 'Received response from ' + self._name + ' :: ' + item.toString());
        
          callback(rslt);
        
        });
      });
    
      // ---------------------------------------------------
      request.setTimeout(this._timeout, function(){
        LOGGER.log('warn', 'Timeout while trying to connect to ' + self._name + ' :: ' + item.toString());
      
        request.abort();
        callback(new Error(helper.buildMessage(CONFIGS['message']['service_timeout'], [self._name])));
      });
    
      // ---------------------------------------------------
      request.on('error', function(e){
      
      
        if(e.message.indexOf('ECONNREFUSED') >= 0){
          LOGGER.log('error', self._name + ' does not appear to be responding. :: ' + item.toString());
        
          callback(new Error(helper.buildMessage(CONFIGS['message']['service_connection_refused'], [self._name])));
        
        }else if(e.message.indexOf('socket hang up') >= 0){
          LOGGER.log('error', self._name + ' timed out. :: ' + item.toString());
        
          callback(new Error(helper.buildMessage(CONFIGS['message']['service_timeout'], [self._name])));
        
        }else{
          LOGGER.log('error', 'Error occurred while connecting to ' + self._name + ': ' + e.message + ' :: ' + item.toString());
          callback(e);
        }
      
      });
    
      LOGGER.log('debug' + 'Sending: ' + data + ' :: ' + item.toString());
    
      request.write(data);
      request.end();
  
    }else{
      throw new Error(helper.buildMessage(CONFIGS['message']['service_no_target_defined'], [self._name]));
    }
  
  };

};

// -----------------------------------------------------------------------------------------------
module.exports = Service;