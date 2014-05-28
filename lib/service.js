var util = require('util'),
    events = require('events'),
    url = require('url'),
    uuid = require('node-uuid');

/* -----------------------------------------------------------------------------------------------
 * Service: The service calls an external web service and passes in a JSON representation of the items
 *          passed in from the client. It then processes the standard JSON sent back from the target
 *          web service and converts it into item.js objects that it passes on to it's Tier for processing.
 *
 * The service makes a HTTP POST call passing JSON data to the target
 *
 * The configuration of the target's location and the rules surrounding how and when it will be called
 * are found in config/services.yaml
 * ----------------------------------------------------------------------------------------------- 
 */
function Service(name) {
  
  // Do the initialization  
  if(typeof name == 'string'){
    if(name.trim() != ''){
      
      // Call the constructor for EventEmitter
      events.EventEmitter.call(this);
      
      this._name = helper.safeAssign('string', name, 'unknown');

      var _config = {},
          self = this;
  
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
  
      this._itemTypesReturned = _config['items_types_returned'] || [];
  
      this._referrerBlock = _config['do_not_call_if_referrer_from'] || [];

      this._translator = helper.safeAssign('string', _config['translator'], undefined);
      
    }else{
      throw new Error(helper.buildMessage(CONFIGS['message']['service_no_name']));
    }
    
  }else{
    throw new Error(helper.buildMessage(CONFIGS['message']['service_no_name']));
  }
  
  // -----------------------------------------------------------------------------
  // Also emits 'success' and 'error' which are meant to be caught by the Tier
  // -----------------------------------------------------------------------------
  this.on('response', function(data){
    
    if(data instanceof Array){
      this.emit('success', data);
    }else{
      this.emit('error', data);
    }
    
  });
  
};

// -----------------------------------------------------------------------------------------------
util.inherits(Service, events.EventEmitter);

// -----------------------------------------------------------------------------------------------
Service.prototype.getName = function(){ return this._name; }
// -----------------------------------------------------------------------------------------------
Service.prototype.getDisplayName = function(){ return this._displayName; }
// -----------------------------------------------------------------------------------------------
Service.prototype.isEnabled = function(){ return this._enabled; }
// -----------------------------------------------------------------------------------------------
Service.prototype.getReferrerBlock = function(){ return this._referrerBlock; }
// -----------------------------------------------------------------------------------------------
Service.prototype.returnsItemType = function(type){ var self = this; return _.contains(self._itemTypesReturned, type); }
// -----------------------------------------------------------------------------------------------
Service.prototype.toString = function() { return this._name; }
  
// -----------------------------------------------------------------------------------------------
Service.prototype.call = function(item, headers){  
  var _transactionId = uuid.v4(),
      _data = serializer.itemToJsonForService(_transactionId, item),
      self = this;
  
  LOGGER.log('debug', _transactionId + ' : Calling ' + self._name);
  
  if(typeof self._target != 'undefined' && self._target != ''){
    var _now = new Date(),
        _http = require('http'),
        _out = '',
        _aborted = false,
        _destination = url.parse(self._target),
        _options = {hostname: _destination.hostname,
                   port: _destination.port,
                   path: _destination.path,
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
      _options['headers'][key] = value;
    });

    // Do the HTTP Request
    var _request = _http.request(_options, function(response){
      // ---------------------------------------------------
      response.setEncoding('utf8');

      // ---------------------------------------------------
      response.on('data', function(chunk){

        // Limit the response size so we don't ever accidentally get a Buffer overload
        if(_out.length > CONFIGS['application']['service_max_response_length']){
          _request.abort();
          _aborted = true;

          LOGGER.log('error', _transactionId + ' : ' + _out);
      
          self.emit('response', self._buildError(_transactionId, 'fatal', 'service_buffer_overflow'));
    
        }else{
          _out += chunk;
        }
      });
  
      // ---------------------------------------------------
      response.on('end', function(){
        var _rslt = undefined;
  
        try{
          
          if(!_aborted){
            switch(response.statusCode){
    
              case 200: // SUCCESS
                var _json = JSON.parse(_out);

                // If the result is for the current request then convert the json to objects
                if(_json['id'] == _transactionId){
                  if(typeof _json[item.getType() + 's'] != 'undefined'){
        
                    // If the result from the service is an Array, convert each item and add it to the result
                    if(_json[item.getType() + 's'] instanceof Array){
                      _rslt = [];
                
                      _.forEach(_json[item.getType() + 's'], function(it){
                        _rslt.push(helper.mapToItem(item.getType(), false, it));
                      });
                
                    }else{
                      // Otherwise this is a single item so convert it and add it to the response
                      _rslt = helper.mapToItem(item.getType(), false, _json[item.getType() + 's'][0]);
                    }
              
                    // If the result is undefined then we received an undefined item type, so throw an error
                    if(typeof _rslt == 'undefined'){ 
                      self.emit('response', self._buildError(_transactionId, 'error', 'service_unknown_item'));
                  
                    }else{
                      // successfully processed JSON response from target
                      LOGGER.log('debug', _transactionId + ' : Received response from ' + self._name);
                      
                      self.emit('response', _rslt);
                    }
    
                  }else{
                    self.emit('response', self._buildError(_transactionId, 'error', 'service_unknown_item'));
                  }
    
                }else{
                  self.emit('response', self._buildError(_transactionId, 'error', 'service_wrong_response'));
                }
                
                break;
      
              case 400: // BAD REQUEST
                self.emit('response', self._buildError(_transactionId, 'error', 'service_bad_request'));
                break;
      
              case 404: // NOT FOUND
                self.emit('response', [new Item(item.getType(), false, {})]);
          
                break;
      
              default: // ERROR!!!
                var json = JSON.parse(_out);
          
                LOGGER.log('error', _transactionId + ': No valid HTTP response received from ' + self._name + ' - status: ' + response.statusCode);
                LOGGER.log('error', _transactionId + ': ' + _out);
          
                if(typeof json['error']['level'] != 'undefined'){
                  self.emit('response', self._buildError(_transactionId, json['error']['level'], json['error']['message']));
                  
                }else{
                  self.emit('response', self._buildError(_transactionId, 'fatal', 'service_server_error_fatal'));
                }
            
                break;
            }
        
          } // if(!_aborted)
  
        }catch(e){
          // If its invalid JSON
          if(e.message.indexOf('Unexpected token') >= 0){
            self.emit('response', self._buildError(_transactionId, 'fatal', 'service_bad_json'));
        
            LOGGER.log('error', _transactionId + ': ' + _out);
      
          }else{        
            self.emit('response', self._buildError(_transactionId, 'error', 'service_server_error'));
        
            LOGGER.log('error', _transactionId + ': ' + e.message);
            LOGGER.log('error', _transactionId + ': ' + _out);
            LOGGER.log('error', _transactionId + ': ' + e.stack);
          }
        }
  
      });

    }); // http.request 

    // ---------------------------------------------------
    _request.setTimeout(self._timeout, function(){
      LOGGER.log('warn', _transactionId + ' : Timeout while trying to connect to ' + self._name);

      _request.abort();

      self.emit('response', self._buildError(_transactionId, 'warning', 'service_timeout'));
    });

    // ---------------------------------------------------
    _request.on('error', function(e){

      if(e.message.indexOf('ECONNREFUSED') >= 0){
        LOGGER.log('error', _transactionId + ' : ' + self._name + ' does not appear to be responding.');
  
        self.emit('response', self._buildError(_transactionId, 'warning', 'service_connection_refused'));
    
      }else if(e.message.indexOf('socket hang up') >= 0){
        LOGGER.log('error', _transactionId + ' : ' + self._name + ' timed out.');

        self.emit('response', self._buildError(_transactionId, 'warning', 'service_timeout'));

      }else{
        LOGGER.log('error', _transactionId + ' : Error occurred while connecting to ' + self._name);
        LOGGER.log('error',  _transactionId + ' : ' + e.message);
  
        self.emit('response', self._buildError(_transactionId, 'error', 'service_server_error'));
      }

    });
    
    // Send the JSON to the service target
    _request.write(_data);
    _request.end();
    
  }else{
    self.emit('response', self._buildError(_transactionId, 'fatal', 'service_no_target_defined'));
  }
  
};
  
// -----------------------------------------------------------------------------------------------
Service.prototype._buildError = function(transactionId, level, message){
  var _msg = (typeof CONFIGS['message'][message] != 'undefined') ? helper.buildMessage(CONFIGS['message'][message], [this._name]) : message;
  
  LOGGER.log('error', transactionId + ': ' + _msg);
  
  return new Item('error', true, {'level':level, 'message': _msg});
};
  

module.exports = Service;