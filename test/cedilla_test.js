"use strict";

var assert = require('assert');
var url = require('url');

var CONFIGS = require("../lib/config.js");
var TEST = require("./prep.js");
var Item = require("../lib/models/item.js");
var serializer = require("../lib/utils/serializer.js");
    
describe('cedilla.js testing', function(){
  this.timeout(20000);

  // ----------------------------------------------------------------------------------------
  before(function(done){
    // Wait for the config file and all modules have finished loading before starting up the server
    var delayStartup = setInterval(function(){
      if(typeof Item !== 'undefined'){
        clearInterval(delayStartup);
    
        var cedilla = require('../cedilla.js');
        
        // This is not the ideal way to wait for the system to come online
        var waitTilOnline = setInterval(function(){
          if(cedilla.isOnline()){
            clearInterval(waitTilOnline);
            
            console.log('Cedilla is now online.');
            done();
          }
        }, 500);
      }
    });
  });
  
  // ----------------------------------------------------------------------------------------
  it('verifying that the default_content_service starts up if the config says to do so', function(done){
    
    console.log('CEDILLA: verifying that default_content_service starts up if its enabled in config/application.yaml');
    
    if(CONFIGS.application.default_content_service){
      var defaultService = url.parse('http://localhost:' + CONFIGS.application.default_content_service_port + '/default');
    
      sendRequest(defaultService, serializer.itemToJsonForService('ABCD123', TEST.fullItem, false), function(status){
        assert.equal(status, 200);
        
        done();
      });
      
    }else{
      // The config has it turned off so just skip the test
      done();
    }
  });
  
});

// ----------------------------------------------------------------------------------------
var sendRequest = function(target, payload, callback){
  var _http = require('http'),
      _options = {hostname: target.hostname,
                   port: target.port,
                   path: target.path,
                   method: 'POST',
                   headers: {'Content-Type': 'text/json; charset="utf-8"', 
                                                 'Content-Length': Buffer.byteLength(payload),
                                                 'Accept': 'text/json',
                                                 'Accept-Charset': 'utf-8',
                                                 'Cache-Control': 'no-cache'}};
  try{
    var _request = _http.request(_options, function(response){
      var _data = '';
    
      response.on('data', function(chunk){
        _data += chunk;
      });

      // ---------------------------------------------------
      response.on('end', function(){
        callback(response.statusCode, response.headers, _data);
      });
    });
    
    _request.write(payload);
    _request.end();
  
  }catch(Error){
    console.log('Error connecting to server: ' + Error);
  }
  
};
