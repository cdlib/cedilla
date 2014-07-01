var Consortial = function(){
  if(typeof CONFIGS['application']['consortial_service'] != 'undefined'){
    this._code_target = CONFIGS['application']['consortial_service']['translate_from_code'];
    this._ip_target = CONFIGS['application']['consortial_service']['translate_from_ip'];

    // We defer the translation of the affiliation information to an external service. That service
    // is expected to return a single value.
    this._translate = function(target, value, callback){
      var _http = require('http'),
          _destination = url.parse(target.replace('?', encodeURIComponent(value))),
          _options = {hostname: _destination.hostname,
                      port: _destination.port,
                      path: _destination.path,
                      method: 'GET'};

      var _request = _http.request(_options, function(response){
        var _out = '';
    
        // ---------------------------------------------------
        response.setEncoding('utf8');

        // ---------------------------------------------------
        response.on('data', function(chunk){
          // Limit the response size so we don't ever accidentally get a Buffer overload
          if(_out.length > CONFIGS['application']['service_max_response_length']){
            _request.abort();
            _aborted = true;

            LOGGER.log('error', CONFIGS['message']['consortial_too_large']);

          }else{
            _out += chunk;
          }
        });

        // ---------------------------------------------------
        response.on('end', function(){
          callback(_out == '' ? 'unknown' : _out);
        });
    
      });
  
      _request.on('error', function(err){
        LOGGER.log('error', CONFIGS['message']['consortial_error'] + ' : ' + err);
      });
  
      _request.end();
    };
  }
};

// -------------------------------------------------------------------
Consortial.prototype.translateCode = function(code, callback){
  this._translate(this._code_target, code, function(response){
    callback(response);
  });
};

// -------------------------------------------------------------------
Consortial.prototype.translateIp = function(ip, callback){
  this._translate(this._ip_target, ip, function(response){
    callback(response);
  });
};

// -----------------------------------------------------------------------------------------------
module.exports = Consortial;