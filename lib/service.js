var CONFIGS = require('./config.js'),
    LOGGER = require('./logger.js');

var url = require('url'),
    uuid = require('node-uuid'),
    _ = require('underscore'),
    helper = require('./helper.js'),
    serializer = require('./serializer.js'),
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
  
      this._config = this._getConfig();
  
      this._displayName = helper.safeAssign('string', this._config['display_name'], this._name);
  
      this._enabled = helper.safeAssign('boolean', this._config['enabled'], false);
      this._maxAttempts = helper.safeAssign('number', this._config['max_attempts'], 1);
      this._timeout = helper.safeAssign('number', this._config['timeout'], 30000);
  
      this._target = helper.safeAssign('string', this._config['target'], undefined);
  
      this._translator = helper.safeAssign('string', this._config['translator'], undefined);
      
    }else{
      throw new Error(helper.buildMessage(CONFIGS['message']['service_no_name']));
    }
  }else{
    throw new Error(helper.buildMessage(CONFIGS['message']['service_no_name']));
  }
  
};

// -----------------------------------------------------------------------------------------------
Service.prototype.getName = function(){ return this._name; }
// -----------------------------------------------------------------------------------------------
Service.prototype.getDisplayName = function(){ return this._displayName; }
// -----------------------------------------------------------------------------------------------
Service.prototype.isEnabled = function(){ return this._enabled; }
// -----------------------------------------------------------------------------------------------
Service.prototype.toString = function() { return this._name; }
  
// -----------------------------------------------------------------------------------------------
Service.prototype.call = function(item, headers, callback){
  var now = new Date(),
      http = require('http'),
      self = this;
      
  var _transactionId = uuid.v4(),
      _out = "",
      _aborted = false,
      _map = helper.itemToMap(item),
      _itemOut = new Item(item.getType(), false, {});
            
  if(typeof self._translator != 'undefined'){
		
		if(self.getName() == 'sfx'){ console.log('translating: ' + self._translator); }
		
    var translator = new Translator(self._translator);
    _map = translator.translateMap(_map);
  }

	if(self.getName() == 'sfx'){ console.log(_map); }
	
  _itemOut.addAttributes(_map);
  
  // Build the JSON post data for the citation
  var _data = serializer.itemToJsonForService(_transactionId, _itemOut);
  
  LOGGER.log('info', 'Connecting to ' + self._target);
  
  if(typeof self._target != 'undefined'){
    var destination = url.parse(self._target);
    
    var options = {hostname: destination.hostname,
                   port: destination.port,
                   path: destination.path,
                    method: 'POST',
                   headers: {'Content-Type': 'text/json', 
                              'Content-Length': _data.length,
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
                   
    var _request = http.request(options, function(response){
      
      // ---------------------------------------------------
      response.setEncoding('utf8');
      
      // ---------------------------------------------------
      response.on('data', function(chunk){

        // Limit the response size so we don't ever accidentally get a Buffer overload
        if(_out.length > CONFIGS['application']['service_max_response_length']){
          _request.abort();
          
          LOGGER.log('error', 'response is too large! aborting connection with ' + self._name);
          LOGGER.log('error', out);
          
          _aborted = true
          
          _out = 'service_buffer_overflow';
          
        }else{
          _out += chunk;
        }
      });
      
      // ---------------------------------------------------
      response.on('end', function(){
        var rslt = undefined;
        
        try{
          if(!_aborted){
            switch(response.statusCode){
          
              case 200: // SUCCESS
                var json = JSON.parse(_out);
        
                // If the result is for the current request then convert the json to objects
                if(json['id'] == _transactionId){
                  if(typeof json[item.getType() + 's'] != 'undefined'){
              
                    // If the result from the service is an Array, convert each item and add it to the result
                    if(json[item.getType() + 's'] instanceof Array){
                      rslt = [];
                      
                      _.forEach(json[item.getType() + 's'], function(it){
                        rslt.push(helper.mapToItem(item.getType(), false, it));
                      });
                      
                    }else{
                      // Otherwise this is a single item so convert it and add it to the response
                      rslt = helper.mapToItem(item.getType(), false, json[item.getType() + 's'][0]);
                    }
                    
                    // If the result is undefined then we received an undefined item type, so throw an error
                    if(typeof rslt == 'undefined'){ 
                      LOGGER.log('error', 'Unable to translate the result for ' + self._name + ' :: ' + item.toString());
                      LOGGER.log('error', json);
                      
                      // This is a warning to the client because it has no control over this translation
                      rslt = helper.mapToItem('error', true, {'level': 'warning',
                                                              'message': helper.buildMessage(CONFIGS['message']['service_unable_to_translate'], [self._name])});
                    }
          
                  }else{
                    LOGGER.log('error', 'Undefined item type received for ' + self._name + ' :: ' + item.toString());
                    LOGGER.log('error', json);
                    
                    // This is a warning as far as the client is concerned
                    rslt = helper.mapToItem('error', true, {'level': 'warning',
                                                            'message': helper.buildMessage(CONFIGS['message']['service_unknown_item'], [self._name])});
                  }
          
                }else{
                  LOGGER.log('error', 'Response received was NOT from ' + self._name + ' :: ' + item.toString());
                  LOGGER.log('error', 'Expecting transaction id: ' + _transactionId + ' but got: ' + json['id']);
              
                  // This is a warning as far as the client is concerned because it has no control over the communication here
                  rslt = helper.mapToItem('error', true, {'level': 'warning',
                                                          'message': helper.buildMessage(CONFIGS['message']['service_wrong_response'], [self._name])});
                }
                break;
            
              case 400: // BAD REQUEST
                LOGGER.log('error', 'There was a problem with the JSON sent to ' + self._name + ' :: ' + item.toString());
                LOGGER.log('error', _data);
                
                // This is a warning as far as the client application is concerned because it has no control over the JSON sent to the service
                rslt = helper.mapToItem('error', true, {'level': 'warning',
                                                        'message': helper.buildMessage(CONFIGS['message']['service_bad_request'], [self._name])});
                break;
            
              case 404: // NOT FOUND
                LOGGER.log('debug', self._name + ' service found no results :: ' + item.toString());

                rslt = helper.mapToItem(item.getType(), false, {});
                break;
            
              default: // ERROR!!!
                var json = JSON.parse(_out);
                
                if(json['level'] == 'fatal'){
                  // TODO: Update the service.yaml to bring this service offline and email the service admin and aggregator team
                
                  rslt = helper.mapToItem('error', true, {'level': 'error',
                                                          'message': helper.buildMessage(CONFIGS['message']['service_server_error_fatal'], [self._name])});
                
                }else if(json['level'] == 'error'){
                  // Its an error, pass it on to the client for them to interpret
                  rslt = helper.mapToItem('error', true, {'level': 'error',
                                                          'message': helper.buildMessage(CONFIGS['message']['service_server_error'], [self._name])});
                
                }else{
                  // Send back an empty citation
                  rslt = helper.mapToItem(item.getType(), false, {});
                }
              
                break;
            }
            
          }else{
            // The request was aborted during processing
            rslt = helper.mapToItem('error', true, {'level': 'error',
                                                    'message': helper.buildMessage(CONFIGS['message'][_out], [self._name])});
          }
        
        }catch(e){
          // If its invalid JSON
          if(e.message.indexOf('Unexpected token') >= 0){
            LOGGER.log('error', self._name + ' did not receive valid JSON back from the service.');
            LOGGER.log('error', _out);
            
            rslt = helper.mapToItem('error', true, {'level': 'warning',
                                                    'message': helper.buildMessage(CONFIGS['message']['service_bad_json'], [self._name])});
            
          }else{
            LOGGER.log('error', self._name + ' encountered an error while processing the response: ' + e.message);
            LOGGER.log('error', _out);
            
            rslt = helper.mapToItem('error', true, {'level': 'error',
                                                    'message': helper.buildMessage(CONFIGS['message']['service_server_error'], [self._name])});
          }
        }
        
        LOGGER.log('debug', 'Received response from ' + self._name);
        
        callback(rslt);
        
      });
    });
    
    // ---------------------------------------------------
    _request.setTimeout(self._timeout, function(){
      LOGGER.log('warn', 'Timeout while trying to connect to ' + self._name + ' :: ' + item.toString());
      
      _request.abort();
      callback(helper.mapToItem('error', true, {'level': 'warning',
                                                'message': helper.buildMessage(CONFIGS['message']['service_timeout'], [self._name])}));
    });
    
    // ---------------------------------------------------
    _request.on('error', function(e){
      
      if(e.message.indexOf('ECONNREFUSED') >= 0){
        LOGGER.log('error', self._name + ' does not appear to be responding.');
        
        callback(helper.mapToItem('error', true, {'level': 'warning',
                                                  'message': helper.buildMessage(CONFIGS['message']['service_connection_refused'], [self._name])}));
        
      }else if(e.message.indexOf('socket hang up') >= 0){
        LOGGER.log('error', self._name + ' timed out.');
        
        callback(helper.mapToItem('error', true, {'level': 'warning',
                                                  'message': helper.buildMessage(CONFIGS['message']['service_timeout'], [self._name])}));
        
      }else{
        LOGGER.log('error', 'Error occurred while connecting to ' + self._name + ': ' + e.message);
        
        callback(helper.mapToItem('error', true, {'level': 'error', 'message': e.message}));
      }
      
    });
    
    LOGGER.log('debug' + 'Sending: ' + _data);
    
    _request.write(_data);
    _request.end();
  
  }else{
    throw new Error(helper.buildMessage(CONFIGS['message']['service_no_target_defined'], [self._name]));
  }
  
};

// -----------------------------------------------------------------------------------------------
Service.prototype._getConfig = function(){
  var self = this;
  var ret = {};
  
  _.forEach(CONFIGS['services']['tiers'], function(services, tier){
    _.forEach(services, function(config, name){
      if(name == self._name){ ret = config; }
    });
  });
  
  return ret;
};

// -----------------------------------------------------------------------------------------------
module.exports = Service;