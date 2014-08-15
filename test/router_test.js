require('../init.js');
require("./prep.js");
    
describe('router.js testing', function(){
  this.timeout(10000);
  
  // ----------------------------------------------------------------------------------------
  before(function(done){
    // Wait for the config file and init.js have finished loading before starting up the server
    var delayStartup = setInterval(function(){
      if(typeof Item != 'undefined'){
        clearInterval(delayStartup);
		
        require('../cedilla.js');
        
        setTimeout(function(){
          console.log('.... pausing to wait for Cedilla startup.');
					done();
				}, 1000);
			}
		}, 500);
	});

	// ----------------------------------------------------------------------------------------
	it('should return the index.html', function(done){
	  var target = 'http://localhost:' + CONFIGS['application']['port'] + '/';
  
	  console.log('ROUTER: should return the index.ejs from ' + target);
  
	  sendRequest(url.parse(target), {}, function(status, headers, body){
	    assert.equal(status, 200);
			assert(body.indexOf('Test an OpenUrl') >= 0);
  
	    done();
	  });
	});

	// ----------------------------------------------------------------------------------------
	it('should call the citation echo service', function(done){
	  // This one gets a decent test of the OpenURL conversion as well
	  var qs = helper.mapToQueryString(helper.itemToMap(fullItem)),
	      target = 'http://localhost:' + CONFIGS['application']['port'] + '/citation?' + qs;
  
	  console.log('ROUTER: should properly echo back the openURL as a citation item (as JSON)');
  
		var headers = {'Accept': 'text/json', 'Accept-Charset': 'utf-8'};
		
	  sendRequest(url.parse(target), headers, function(status, headers, body){
	    assert.equal(status, 200);
	    assert.equal('application/json', headers['content-type']);
  
	    var json = JSON.parse(body),
					config = CONFIGS['data']['objects'][fullItem.getType()]['attributes'];
  
	    _.forEach(config, function(attribute){
	      if(attribute == 'original_citation'){
	        assert.equal(qs, json['original_citation']);
        
	      }else{
	        assert.equal('foo-bar', json[attribute]);
	      }
	    });
  
	    done();
	  });
	});
	
});

// ----------------------------------------------------------------------------------------
var sendRequest = function(target, headers, callback){
  var _http = require('http'),
      _response = {},
      _options = {hostname: target.hostname,
                   port: target.port,
                   path: target.path,
                   method: 'GET'};

	if(_.size(headers) > 0){
		_options['headers'] = headers;
	}

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
    
    _request.end();
  
  }catch(Error){
    console.log('Error connecting to server: ' + Error);
  }
  
};