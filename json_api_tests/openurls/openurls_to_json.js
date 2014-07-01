require("../../init.js");
require("../prep.js");

describe('openurl tests to validate translation of incoming openurl requests into the JSON that gets sent to services', function(){
  this.timeout(10000);
  
  var _tests = {},
      _results = {};
  
  // ---------------------------------------------------------------------------------------------------
  before(function(done){
    // Wait for the config file and init.js have finished loading before starting up the server
    var delayStartup = setInterval(function(){
      if(typeof Item != 'undefined'){
        clearInterval(delayStartup);
        
				require('../../cedilla.js');
				
        _oldServiceCallMethod = Service.prototype.call;
  
        // ----------------------------------------
        Service.prototype.call = function(item, headers){
          var _unmapped = querystring.parse(this._requestorParams['unmapped']);

          if(_unmapped['testing_for'] == 'holdings'){
      
            _results[_unmapped['testing_name']] = serializer.itemToJsonForService(unmapped['testing_id'], item, this._requestorParams);;
          }
          
          this.emit('response', [new Item(rootItemType, false, {})]);
        };
  
        // Load the tests file
        _tests = yaml.load(fs.readFileSync(process.cwd() + '/test/openurl/openurls.yaml', 'utf8'));
          
        done();
      }
    }, 100);
  });

  // ---------------------------------------------------------------------------------------------------
  after(function(done){
    // Return the Service object back to its original state
    Service.prototype.call = _oldServiceCallMethod;
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
                     'force new connection': false};

      _.forEach(_tests, function(tests, service){
        console.log('OPENURL TESTS FOR: ' + service);
      
        var i = 0,
						_completed = 0;
          
        var check = setInterval(function(){        
          if(_completed >= _.size(tests) && _completed != 0){
            clearInterval(check);
          
            _.forEach(_results, function(json, name){
              console.log(name);
              console.log(json);
              console.log('-----------------------------------');
            });
          
            done();
          }
        }, 100);
      
        _.forEach(tests, function(openurl, test){
					var _client = _io.connect('http://localhost:' + CONFIGS['application']['port'] + '/', _options);
					
          _client.on('connect', function(){
            _client.emit('openurl', unescape(openurl).replace(/&amp;/g, '&') + '&testing_for=' + service + '&testing_id=' + i + '&testing_name=' + test);

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