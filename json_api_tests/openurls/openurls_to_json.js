require("../../init.js");
require("../../test/prep.js");

describe('openurl tests to validate translation of incoming openurl requests into the JSON that gets sent to services', function(){
  this.timeout(10000);
  
  var _tests = {},
      _results = {},
			file = undefined,
			log_debug_old = undefined, log_info_old = undefined, log_error_old = undefined, log_warn_old = undefined, log_fatal_old = undefined;
  
  // ---------------------------------------------------------------------------------------------------
  before(function(done){
    // Wait for the config file and init.js have finished loading before starting up the server
    var delayStartup = setInterval(function(){
			
			stream = fs.createWriteStream(process.cwd() + '/json_api_tests/openurls/results.log');
			
			// Once the init file resources have loaded
      if(typeof Item != 'undefined' && typeof log != 'undefined'){
				// Once the file stream is ready
				stream.once('open', function(fd){
	        clearInterval(delayStartup);
        
					require('../../cedilla.js');
				
	        _oldServiceCallMethod = Service.prototype.call;
  
	        // ----------------------------------------
	        Service.prototype.call = function(item, headers){
	          var _unmapped = querystring.parse(this._requestorParams['unmapped']);

	          if(_unmapped['testing_for'] == 'holdings'){
      
	            _results[_unmapped['testing_name']] = serializer.itemToJsonForService(_unmapped['testing_id'], item, this._requestorParams);;
	          }
          
	          this.emit('response', [new Item(rootItemType, false, {})]);
	        };
  
	        // Load the tests file
	        _tests = yaml.load(fs.readFileSync(process.cwd() + '/json_api_tests/openurls/openurls.yaml', 'utf8'));
       
					// Stop the noise from the logger
					log.level('error');
					
	        done();
				});
      }
    }, 100);
  });

  // ---------------------------------------------------------------------------------------------------
  after(function(done){
    // Return the Service object back to its original state
    Service.prototype.call = _oldServiceCallMethod;
		
		if(stream) stream.end();
    done();
  });

  // ---------------------------------------------------------------------------------------------------
  beforeEach(function(done){
    _results = {};

    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  it('should properly translate all openurls to JSON for services', function(done){
    if(_tests){
      var _io = require('socket.io-client'),
      		_options = {transports: ['websocket'],
                     'force new connection': false},
					_written = 0;

      _.forEach(_tests, function(tests, service){
        console.log('OPENURL TESTS FOR: ' + service);
      
        var i = 0,
						_completed = 0;
          
        var check = setInterval(function(){        
          if(_completed >= _.size(tests) && _completed != 0){
            clearInterval(check);
          
            _.forEach(_results, function(json, name){
							if(stream){
								stream.write(name + "\r\n" + json + "\r\n-----------------------------------\r\n", '', function(){
									_written ++;
								});
								
							}else{
								console.log('*** The stream was closed! ***');
							}
            });
          
						var waitForWrites = setInterval(function(){
							if(_written >= _completed){
								clearInterval(waitForWrites);
								
								console.log('*** Finished writing ' + _written + ' results of test to results.log ***');
								done();
							}
						});
          }
        }, 100);
      
        _.forEach(tests, function(openurl, test){
					var _client = _io.connect('http://localhost:' + CONFIGS['application']['port'] + '/', _options);
					
					openurl += '&cedilla:affiliation=UCB&testing_for=' + service + '&testing_id=' + i + '&testing_name=' + test;
					
          _client.on('connect', function(){
            _client.emit('openurl', unescape(openurl).replace(/&amp;/g, '&'));

            _client.on('complete', function (data) {
              _completed++; 

              _client.disconnect();
            });
          
            i++;
          });
					
					_client.on('connect_error', function(err){
						console.log('client error: ' + err);
					});
        
					_client.on('connect_timeout', function(){
						console.log('client timed out!!');
					});
				
        });
      
      });
      
    }else{
      console.log('.... could not find the ./test/openurl/openurls.yaml file!');
    }
  });
  
});