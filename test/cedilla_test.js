require('../init.js');
    
describe('cedilla.js testing', function(){
  this.timeout(10000);
  
  var item = undefined,
      oldServiceCallMethod = undefined;
  
  // ----------------------------------------------------------------------------------------
  before(function(done){
    // Wait for the config file and init.js have finished loading before starting up the server
    var delayStartup = setInterval(function(){
      if(typeof Item != 'undefined'){
        clearInterval(delayStartup);
    
        _.forEach(CONFIGS['data']['objects'], function(def, type){
          if(def['root']){
            var params = {};
        
            _.forEach(def['attributes'], function(attribute){
              params[attribute] = 'foo-bar';
            })
        
            item = new Item(type, true, params);
          }
        });
    
        require('../cedilla.js');
        
        setTimeout(function(){
          console.log('.... pausing to wait for Cedilla startup.');
          
          // Capture the original Service.call so that we can set it back after its been overriden
          oldServiceCallMethod = Service.prototype.call;
    
          // Override the actual service call and return a stub item
          Service.prototype.call = function(item, headers){
            var map = {},
                type = item.getType();

            if(typeof CONFIGS['data']['objects'][type] != 'undefined'){
              _.forEach(CONFIGS['data']['objects'][type]['attributes'], function(attribute){
                map[attribute] = 'foo';
              });
        
              _.forEach(CONFIGS['data']['objects'][type]['children'], function(child){
                var param = {};
                param[CONFIGS['data']['objects'][child]['attributes'][0]] = 'yadda';
          
                map[child + 's'] = [new Item(child, true, param)];
              });
            }
     
            this.emit('response', [helper.mapToItem(type, false, map)]);
          };
    
          done();
          
        }, 1000);
    
      }
    });
  });
  
  after(function(){
    Service.prototype.call = oldServiceCallMethod;
  });
  
  // ----------------------------------------------------------------------------------------
  it('verifying that the default_content_service starts up if the config says to do so', function(done){
    
    console.log('CEDILLA: verifying that default_content_service starts up if its enabled in config/application.yaml');
    
    if(CONFIGS['application']['default_content_service']){
      var defaultService = url.parse('http://localhost:' + CONFIGS['application']['default_content_service_port'] + '/default');
    
      sendRequest(defaultService, serializer.itemToJsonForService('ABCD123', item, false), function(status, headers, body){
        assert.equal(status, 200);
        
        done();
      });
      
    }else{
      // The config has it turned off so just skip the test
      done();
    }
  });
  
  // ----------------------------------------------------------------------------------------
  it('should return the index.html', function(done){
    var target = 'http://localhost:' + CONFIGS['application']['port'] + '/';
    
    console.log('CEDILLA: should return the index.html');
    
    sendRequest(url.parse(target), serializer.itemToJsonForService('ABCD123', item, false), function(status, headers, body){
      assert.equal(status, 200);
      assert(body.indexOf('var socket = io.connect(') >= 0);
    
      done();
    });
  });
  
  // ----------------------------------------------------------------------------------------
  it('should call the citation echo service', function(done){
    // This one gets a decent test of the OpenURL conversion as well
    var translator = new Translator('openurl'),
        qs = helper.mapToQueryString(translator.translateMap(helper.itemToMap(item), true)),
        target = 'http://localhost:' + CONFIGS['application']['port'] + '/citation?' + qs;
    
    console.log('CEDILLA: should properly echo back the openURL as a citation item (as JSON)');
    
    sendRequest(url.parse(target), serializer.itemToJsonForService('ABCD123', item, {}), function(status, headers, body){
      assert.equal(status, 200);
      assert.equal('application/json', headers['content-type']);
    
      var json = JSON.parse(body);
    
      _.forEach(CONFIGS['data']['objects'][item.getType()]['attributes'], function(attribute){
        if(attribute == 'original_citation'){
          assert.equal(qs, json['original_citation']);
          
        }else{
          assert.equal('foo-bar', json[attribute]);
        }
      });
    
      done();
    });
  });
  
  // ----------------------------------------------------------------------------------------
  it('should establish a socket.io connection', function(done){
    var io = require('socket.io-client'),
        options = {transports: ['websocket'],
                   'force new connection': true};
    
    console.log('CEDILLA: should establish a socket.io connection and return at least one item type (except error)');
    
    // -----------------------------------
    var client = io.connect('http://localhost:' + CONFIGS['application']['port'] + '/'),
        message = false, error = false;
  
    client.on('connect', function(data){
      client.emit('openurl', 'rft.isbn=9780300177619&rft.genre=book');
    
      client.on('citation', function (data) {
        message = true;
      });
      client.on('author', function (data) {
        message = true;
      });
      client.on('resource', function (data) {
        message = true;
      });
      
      client.on('error', function (data) {
        error = true;
      });
  
      client.on('complete', function (data) {
        assert(message);
        assert(!error);
      
        client.disconnect();
        done();
      });
    });
    
  });
  
  
  // ----------------------------------------------------------------------------------------
  var sendRequest = function(target, payload, callback){
    var _http = require('http'),
        _response = {},
        _options = {hostname: target.hostname,
                     port: target.port,
                     path: target.path,
                     method: 'GET',
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
  
});