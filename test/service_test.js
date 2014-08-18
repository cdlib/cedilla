require('../init.js');

var mockery = require('./mock_services.js');

// ---------------------------------------------------------------------------------------------------
describe('service.js', function(){
  this.timeout(20000);
  
  var item = undefined,
      returnField = undefined,
      returnValue = 'foo-bar',
      mockServer = undefined;
  
  // ---------------------------------------------------------------------------------------------------
  before(function(done){
    var type = '';
    
    // Wait for the config file and init.js have finished loading before starting up the server
    var delayStartup = setInterval(function(){
      if(typeof Item != 'undefined'){
        clearInterval(delayStartup);
        
        // ---------------------------------------------------------------------------------------------------
        // Mock some methods onto the Service object so we can manipulate and view all attributes
        // ---------------------------------------------------------------------------------------------------
        Service.prototype.getMaxAttempts = function(){ return this._maxAttempts; };
        Service.prototype.setMaxAttempts = function(value){ this._maxAttempts = value; };
        Service.prototype.getTimeout = function(){ return this._timeout; };
        Service.prototype.setTimeout = function(value){ this._timeout = value; };
        Service.prototype.getTranslator = function(){ return this._translator; };
        Service.prototype.setTranslator = function(value){ this._translator = value; };
        Service.prototype.getTarget = function(){ return this._target; };
        Service.prototype.setTarget = function(value){ this._target = value; };
        Service.prototype.setReferrerBlock = function(values){ this._referrerBlock = values; };
        Service.prototype.setItemTypes = function(values){ this._itemTypesReturned = values; };

        Service.prototype.runTest = function(target, item, callback){
          this.setTarget(target == '' ? '' : ("http://localhost:9000/" + target));
  
          this.on('success', function(items){
            //console.log('... success');
    
            callback({'success': true,
                      'count': _.size(items),
                      'isArray': items instanceof Array,
                      'isItem': _.first(items) instanceof Item,
                      'attributeCount': (typeof _.first(items) != 'undefined') ? _.size(_.first(items).getAttributes()) : 0});
          });
  
          this.on('error', function(error){
            //console.log('... failure: ' + error);
    
            callback({'success': false,
                      'isArray': false,
                      'isItem': true,
                      'attributeCount': 0,
                      'level': (error instanceof Item) ? error.getAttribute('level') : 'unknown',
                      'message': (error instanceof Item) ? error.getAttribute('message') : 'Got an error!'});
          });
  
          this.call(item, {});
        }
    
        _.forEach(CONFIGS['data']['objects'], function(config, name){
          if(typeof config['root'] != 'undefined'){
            type = name;
        
            returnField = config['attributes'][0];
          }
        });

        item = new Item(type, true, {});
    
        // Spin up some stub http servers for testing
        mockServer = mockery.spinUpServer(returnField, returnValue);

        done();
      }
    });
  });
  
  // ---------------------------------------------------------------------------------------------------
  after(function(done){
    mockServer.close();
    
    // Remove monkey patches and return Service to its original state
    Service.prototype.getMaxAttempts = undefined;
    Service.prototype.setMaxAttempts = undefined;
    Service.prototype.getTimeout = undefined;
    Service.prototype.setTimeout = undefined;
    Service.prototype.getTranslator = undefined;
    Service.prototype.setTranslator = undefined;
    Service.prototype.getTarget = undefined;
    Service.prototype.setTarget = undefined;
    Service.prototype.setReferrerBlock = undefined;
    Service.prototype.setItemTypes = undefined;
    Service.prototype.runTest = undefined;
    
    console.log('shutdown mock server.');
    done();
  });

  
  // ---------------------------------------------------------------------------------------------------
  it('should throw an error if no name is supplied!', function(){
    assert.throws(function(){ new Service(); });
    assert.throws(function(){ new Service(undefined, log); });
    assert.throws(function(){ new Service('', log); });
  });

  // ---------------------------------------------------------------------------------------------------
  it('undefined service should return as empty service and disabled!', function(){
    var svc = new Service('tester', log);
    
    console.log('SERVICE: verifying that defaults are properly set');
    
    assert(!svc.isEnabled());
    assert.equal('tester', svc.getName());
    assert.equal('tester', svc.getDisplayName());
    assert.equal('tester', svc.toString());
    
    assert.equal(1, svc.getMaxAttempts());
    assert.equal(30000, svc.getTimeout());
    assert.equal('undefined', typeof svc.getTarget());
    assert.equal('undefined', typeof svc.getTranslator());
    assert.equal(0, _.size(svc.getReferrerBlock()));
    assert.equal(false, svc.returnsItemType(''));
    assert.equal(false, svc.returnsItemType('foo'));
  });
    
  // ---------------------------------------------------------------------------------------------------
  it('should set the attributes appropriately', function(){
    
    console.log('SERVICE: verifying that config settings are properly loaded');
    
    // Test all of the services defined in the ./config/services.yaml to make sure they initialize
    _.forEach(CONFIGS['services']['tiers'], function(services, tier){
      _.forEach(services, function(config, service){
        var svc = new Service(service, log);
    
        assert(config['enabled'] == svc.isEnabled());
        assert.equal(service, svc.getName());
        assert.equal(service, svc.toString());
        assert.equal((typeof config['display_name'] == 'string' ? config['display_name'] : service), svc.getDisplayName());
        
        assert.equal((typeof config['max_attempts'] != 'undefined' ? config['max_attempts'] : 1), svc.getMaxAttempts());
        assert.equal((typeof config['timeout'] != 'undefined' ? config['timeout'] : 30000), svc.getTimeout());
        assert.equal(config['target'], svc.getTarget());
        
        if(typeof config['translator'] != 'undefined'){
          assert.equal(Translator, typeof svc.getTranslator());
        }
      
        assert.equal(_.size(config['do_not_call_if_referrer_from']), _.size(svc.getReferrerBlock()));
        
        _.forEach(config['do_not_call_if_referrer_from'], function(domain){
          assert(_.contains(svc.getReferrerBlock(), domain));
        });
        
        assert.equal(false, svc.returnsItemType('foo'));
        
        _.forEach(config['items_types_returned'], function(type){
          assert(svc.returnsItemType(type));
        });
      });
    });
  });
  
// ---------------------------------------------------------------------------------------------------
// Calling the service
// ---------------------------------------------------------------------------------------------------  
  it('should throw an error when the connection to the service is refused!', function(done){
    var svc = new Service('tester', log);
    
    console.log('SERVICE: verifying that error is thrown when service refuses connection');
    
    // Should get an error because the target is blank!
    var _params = {};
    
    var heartbeat = setInterval(function(){
      if(_.size(_params) > 0){
        clearInterval(heartbeat);
        
        assert.equal(false, _params['success']);
        assert.equal(false, _params['isArray']);
        assert.equal(true, _params['isItem']);
        assert.equal(0, _params['attributeCount']);
        assert.equal('fatal', _params['level']);
        assert.equal(helper.buildMessage(CONFIGS['message']['service_no_target_defined'], [svc.getDisplayName()]), _params['message']);
          
        done();
      }        
    }, 500);
    
    svc.runTest('', item, function(params){ _params = params; });
  });

  // ---------------------------------------------------------------------------------------------------  
  it('should return a valid response from the service!', function(done){
    var svc = new Service('tester', log);
    
    console.log('SERVICE: verifying that HTTP 200 is handled and items were returned');
    
    // Should get an HTTP 200 and an empty Item
    var _params = {};
    
    var heartbeat = setInterval(function(){
      if(_.size(_params) > 0){
        clearInterval(heartbeat);
        
        assert.equal(true, _params['success']);
        assert.equal(true, _params['isArray']);
        assert.equal(true, _params['isItem']);
        assert.equal(1, _params['count']);
        assert.equal(1, _params['attributeCount']);
          
        done();
      }        
    }, 500);
    
    svc.runTest('success', item, function(params){ _params = params; });
  });

  // ---------------------------------------------------------------------------------------------------  
  it('should return a 404 not found from the service!', function(done){
    var svc = new Service('tester', log);
    
    console.log('SERVICE: verifying that 404 not found returns an empty item');
    
    // Should get an HTTP 404 and an empty Item
    var _params = {};
    
    var heartbeat = setInterval(function(){
      if(_.size(_params) > 0){
        clearInterval(heartbeat);
        
        assert.equal(true, _params['success']);
        assert.equal(true, _params['isArray']);
        assert.equal(true, _params['isItem']);
        assert.equal(1, _params['count']);
        assert.equal(0, _params['attributeCount']);
          
        done();
      }        
    }, 500);
    
    svc.runTest('not_found', item, function(params){ _params = params; });
  });

  // ---------------------------------------------------------------------------------------------------  
  it('should return a 400 bad request from the service!', function(done){  
    var svc = new Service('tester', log);
    
    console.log('SERVICE: verifying handling of 400 bad JSON sent to service');
    
    // Should get an HTTP 400 because we're sending bad JSON to the service
    var _params = {};
    
    var heartbeat = setInterval(function(){
      if(_.size(_params) > 0){
        clearInterval(heartbeat);
        
        assert.equal(false, _params['success']);
        assert.equal(true, _params['isItem']);
        assert.equal('error', _params['level']);
        assert.equal(helper.buildMessage(CONFIGS['message']['service_bad_request'], [svc.getDisplayName()]), _params['message']);
          
        done();
      }        
    }, 500);
    
    svc.runTest('bad_request', item, function(params){ _params = params; });
  });
  
  // ---------------------------------------------------------------------------------------------------  
  it('should return a 500 warning error from the service!', function(done){
    var svc = new Service('tester', log);
    
    console.log('SERVICE: verifying handling of 500 "warning" server error from service');
    
    // Should get an HTTP 500 warning message
    var _params = {};
    
    var heartbeat = setInterval(function(){
      if(_.size(_params) > 0){
        clearInterval(heartbeat);
        
        assert.equal(false, _params['success']);
        assert.equal(true, _params['isItem']);
        assert.equal('warning', _params['level']);
        assert.equal('foobar', _params['message']);
          
        done();
      }        
    }, 500);
    
    svc.runTest('warning', item, function(params){ _params = params; });
  });
  
  // ---------------------------------------------------------------------------------------------------  
  it('should return a 500 error from the service!', function(done){
    var svc = new Service('tester', log);
    
    console.log('SERVICE: verifying handling of 500 "error" server error sent from service');
    
    // Should get an HTTP 500 error message
    var _params = {};
    
    var heartbeat = setInterval(function(){
      if(_.size(_params) > 0){
        clearInterval(heartbeat);
        
        assert.equal(false, _params['success']);
        assert.equal(true, _params['isItem']);
        assert.equal('error', _params['level']);
        assert.equal('foobar', _params['message']);
          
        done();
      }        
    }, 500);
    
    svc.runTest('error', item, function(params){ _params = params; });
  });
  
  // ---------------------------------------------------------------------------------------------------  
  it('should return a 500 fatal error from the service!', function(done){
    var svc = new Service('tester', log);
    
    console.log('SERVICE: verifying handling of 500 "fatal" error sent from service');
    
    // Should get an HTTP 500 fatal message
    var _params = {};
    
    var heartbeat = setInterval(function(){
      if(_.size(_params) > 0){
        clearInterval(heartbeat);
        
        assert.equal(false, _params['success']);
        assert.equal(true, _params['isItem']);
        assert.equal('fatal', _params['level']);
        assert.equal('foobar', _params['message']);
          
        done();
      }        
    }, 500);
    
    svc.runTest('fatal', item, function(params){ _params = params; });
  });
  
  // ---------------------------------------------------------------------------------------------------  
  it('should return an id mismatch!', function(done){
    var svc = new Service('tester', log);
    
    console.log('SERVICE: verifying handling of transaction id mismatches');
    
    // Should get a transaction id mismatch!
    var _params = {};
    
    var heartbeat = setInterval(function(){
      if(_.size(_params) > 0){
        clearInterval(heartbeat);
        
        assert.equal(false, _params['success']);
        assert.equal(true, _params['isItem']);
        assert.equal('error', _params['level']);
        assert.equal(helper.buildMessage(CONFIGS['message']['service_wrong_response'], [svc.getDisplayName()]), _params['message']);
          
        done();
      }        
    }, 500);
    
    svc.runTest('wrong_id', item, function(params){ _params = params; });
  });
  
  // ---------------------------------------------------------------------------------------------------  
  it('should return an timeout!', function(done){
    var svc = new Service('tester', log);
    
    console.log('SERVICE: verifying handling of service timeouts');
    
    // Should get a timeout!
    var _params = {};
    
    var heartbeat = setInterval(function(){
      if(_.size(_params) > 0){
        clearInterval(heartbeat);
        
        assert.equal(false, _params['success']);
        assert.equal(true, _params['isItem']);
        assert.equal('warning', _params['level']);
        assert.equal(helper.buildMessage(CONFIGS['message']['service_timeout'], [svc.getDisplayName()]), _params['message']);
          
        done();
      }        
    }, 500);
    
    svc.runTest('timeout', item, function(params){ _params = params; });
  });
  
  // ---------------------------------------------------------------------------------------------------  
  it('should return an error when the service returned an unknown item!', function(done){
    var svc = new Service('tester', log);
    
    console.log('SERVICE: verifying handling of undefined item types snet from service');
    
    // Should get a unknown item type error when the item type returned is not defined in data.yaml!
    var _params = {};
    
    var heartbeat = setInterval(function(){
      if(_.size(_params) > 0){
        clearInterval(heartbeat);
        
        assert.equal(false, _params['success']);
        assert.equal(true, _params['isItem']);
        assert.equal('error', _params['level']);
        assert.equal(helper.buildMessage(CONFIGS['message']['service_unknown_item'], [svc.getDisplayName()]), _params['message']);
          
        done();
      }        
    }, 500);
    
    svc.runTest('unknown_item', item, function(params){ _params = params; });
  });
  
  // ---------------------------------------------------------------------------------------------------  
  it('should return an error when the service does NOT return JSON!', function(done){
    var svc = new Service('tester', log);

    console.log('SERVICE: verifying handling of non JSON responses from service');

    // Should get an error if the service does not return JSON
    var _params = {};
    
    var heartbeat = setInterval(function(){
      if(_.size(_params) > 0){
        clearInterval(heartbeat);
        
        assert.equal(false, _params['success']);
        assert.equal(true, _params['isItem']);
        assert.equal('fatal', _params['level']);
        assert.equal(helper.buildMessage(CONFIGS['message']['service_bad_json'], [svc.getDisplayName()]), _params['message']);
          
        done();
      }        
    }, 500);
    
    svc.runTest('not_json', item, function(params){ _params = params; });
  });
  
  // ---------------------------------------------------------------------------------------------------  
  it('should return an error when the response overflows the buffer!', function(done){
    var svc = new Service('tester', log);
    
    console.log('SERVICE: verifying handling of extremely large responses from service (prevent buffer overflow)');
    
    // Should get an error if the service does not return JSON
    var _params = {};
    
    var heartbeat = setInterval(function(){
      if(_.size(_params) > 0){
        clearInterval(heartbeat);
        
        assert.equal(false, _params['success']);
        assert.equal(true, _params['isItem']);
        assert.equal('fatal', _params['level']);
        assert.equal(helper.buildMessage(CONFIGS['message']['service_buffer_overflow'], [svc.getDisplayName()]), _params['message']);
          
        done();
      }        
    }, 500);
    
    svc.runTest('flood_buffer', item, function(params){ _params = params; });
  });

});




