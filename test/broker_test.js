require("../init.js");
require("./prep.js");

var events = require('events'),
    util = require('util');

// ---------------------------------------------------------------------------------------------------
describe('broker.js', function(){
  this.timeout(10000);
  
  var Socket = undefined,
      _request = undefined,
      _results = [];
  
  var _oldTierProcessMethod = undefined,
      _oldTierHasMinimumCitationMethod = undefined;
  
  // ---------------------------------------------------------------------------------------------------
  before(function(done){
    // Wait for the config file and init.js have finished loading before starting up the server
    var delayStartup = setInterval(function(){
      if(typeof Item != 'undefined'){
        clearInterval(delayStartup);
        
        _oldTierProcessMethod = Tier.prototype.process;
        _oldTierHasMinimumCitationMethod = Tier.prototype._hasMinimumCitation;
    
        // Mock the Tier's process routine to simply send back stub messages
        // ---------------------------------------------------------------------------------------------------
        Tier.prototype.process = function(headers, item){
          var _self = this,
              _items = undefined;

          _.forEach(_self._queue, function(service){
            if(item.getAttribute('title') == 'full_stack'){
              console.log(fullItemWithChildren.getAttribute('authors'));
              _items = [helper.mapToItem(rootItemType, true, fullItemWithChildren)];
            }else{
              _items = [helper.mapToItem(rootItemType, true, fullItem)];
            }

            if(service instanceof Service){
              _self.emit('response', {'service': service.getDisplayName(), 'original': item, 'new': _items});
            }
          });

          _self.emit('message', serializer.itemToJsonForClient('Cedilla', new Item('error', false, 
                                                          {'level':'warning', 
                                                           'message': CONFIGS['message']['tier_unknown_item_type']})));

          _self.emit('complete', 'We are done here!');
        };
        // ---------------------------------------------------------------------------------------------------
        // Override Tier level rules checks so that we don't have to worry about them being filtered out
        Tier.prototype._hasMinimumCitation = function(rules, item){ return true; }

        // ---------------------------------------------------------------------------------------------------
        // Add some methods to store the services that should respond for the item so we can check them in tests
        Item.prototype.setServices = function(services){ this._services = services };
        // ---------------------------------------------------------------------------------------------------
        Item.prototype.getServices = function(services){ return this._services };
      
        done();
      }
    });
  });
  
  // ---------------------------------------------------------------------------------------------------
  after(function(done){
    // Return the Tier and Service objects back to their original state
    Tier.prototype.process = _oldTierProcessMethod;
    Tier.prototype._hasMinimumCitation = _oldTierHasMinimumCitationMethod;
    
    Item.prototype.getServices = undefined;
    Item.prototype.setServices = undefined;
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  beforeEach(function(done){
    _results = [];
    
    // Construct a socket to mock sending messages back to the client
    Socket = function(callback){
      var _self = this;
      
      // Call the constructor for EventEmitter
      events.EventEmitter.call(_self);
      
      _self.handshake = _self.buildHandshake();

      _self.on('complete', function(message){
        callback();
      });
      
      _.forEach(CONFIGS['data']['objects'], function(def, type){
        _self.on(type, function(json){
          _results.push(json);
        });
      });
    };
    util.inherits(Socket, events.EventEmitter);
    
    Socket.prototype.buildHandshake = function(){
      return {
        headers: {},
        time: (new Date) + '',
        address: 'http://my.domain.org',
        xdomain: !!'http://my.domain.org/origin',
        secure: !!false,
        issued: +(new Date),
        url: 'http://my.domain.org/target'
      };
    };
    
    _request = new Request({'referrers': ['my.domain.org'],
                      'content_type': 'text/plain',
                      'ip': '127.0.0.1',
                      'agent': 'Chrome',
                      'language': 'en',
                      'identifiers': ['jdoe@domain.org'],
                      'service_api_version': '1.1',
                      'client_api_version': '1.0',
                      'request': 'testing - item built manually',
                      'type': 'test'});
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  it("should throw an error if the request or socket is missing.", function(done){
    var _socket = new Socket(function(){});
    
    console.log('BROKER: checking errors are thrown for bad socket/item.');
    
    assert.throws(function(){ new Broker(undefined, undefined); }, function(err){ assert.equal(err.message, CONFIGS['message']['broker_bad_request']); return true; });
    assert.throws(function(){ new Broker(undefined, _request); }, function(err){ assert.equal(err.message, CONFIGS['message']['broker_bad_socket']); return true; });
    assert.throws(function(){ new Broker(_socket, undefined); }, function(err){ assert.equal(err.message, CONFIGS['message']['broker_bad_request']); return true; });
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  it("should return bad item errors for unknown item types or invalid items", function(done){
    console.log('BROKER: check invalid item handling.');
    
    var _socket = new Socket(function(){});

    var _invalidItem = new Item(rootItemType, false, {'foo':'bar'});
        
    _request.addReferent(_invalidItem);
  
    var _broker = new Broker(_socket, _request);
  
    assert.equal(_.size(_request.getErrors()), 1);
    assert.equal(_request.getErrors()[0], CONFIGS['message']['broker_bad_item_message']);
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  it('should return a no services error', function(done){
    var _socket = new Socket(function(){});
    
    var _gas = Broker.prototype._getAvailableServices,
        _aars = Broker.prototype._addAlwaysRunServices,
        _fsfcl = Broker.prototype._filterServicesForClientList;
      
    // Override the basic service construction methods
    Broker.prototype._getAvailableServices = function(item){ return []; };
    Broker.prototype._addAlwaysRunServices = function(services){ return []; };
    Broker.prototype._filterServicesForClientList = function(services, clientList){ return []; };
  
    _request.addReferent(fullItem);
    
    var _broker = new Broker(_socket, _request);
  
    assert.equal(1, _.size(_request.getErrors()));
    assert.equal(_request.getErrors()[0], CONFIGS['message']['broker_no_services_available']);
  
    // Set the Broker service construction methods back to their original state
    Broker.prototype._getAvailableServices = _gas;
    Broker.prototype._addAlwaysRunServices = _aars;
    Broker.prototype._filterServicesForClientList = _fsfcl;
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  it('checking consortial logic bubbles errors to request properly', function(done){
    
    if(CONFIGS['application']['consortial_service']){      
      console.log('BROKER: checking consortial logic error handling.');
      
      // Handles consortial errors properly
      // Override the consortial functions to force an error
      var _tc = Consortial.prototype.translateCode,
          _ti = Consortial.prototype.translateIp;
      
      Consortial.prototype.translateCode = function(code, callback){ throw new Error('Error!!'); }
      Consortial.prototype.translateIp = function(ip, callback){ throw new Error('Error!!'); }
    
      var _socket = new Socket(function(){});
    
      _request.addReferent(fullItem);
      
      new Broker(_socket, _request);
      
      assert.equal(_.size(_request.getErrors()), 1);
      assert.equal(_request.getErrors()[0], CONFIGS['message']['broker_consortial_error']);
      
      // Set the consortial object back to normal
      Consortial.prototype.translateCode = _tc;
      Consortial.prototype.translateIp = _ti;
    }else{
      console.log('BROKER: consortial logic diabled, skipping test.');
    }
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  it("checking available service construction", function(done){
    var _socket = new Socket(function(){});
  
    console.log('BROKER: testing available service construction for specified rules.');
    
    _request.addReferent(fullItem);

    var _broker = new Broker(_socket, _request);
    
    assert.equal(_.size(_broker._getAvailableServices(emptyItem)), 0);
    
    var _options = {},
        _service = '';
    
    // Get a set of valid attribute values from rules.yaml
    _.forEach(CONFIGS['rules']['objects'][bareMinimumItem.getType()], function(rules, attribute){
      // This is the first attribute so grab its last value and services 
      if(_service == ''){ 
        _.forEach(rules, function(services, value){
          _service = services;
          _options[attribute] = value;
        });
        
      }else{
        // This isn't the first item attribute so just see if it can respond to the first attribute's services
        _.forEach(rules, function(services, value){
          if(_.contains(services, _.first(_service))){
            _options[attribute] = value;
            
            // Remove any of the other services if they aren't a match for this attribute's value
            _.forEach(_service, function(svc){
              if(!_.contains(services, svc)){
                _service.splice(_service.indexOf(svc), 1);
              }
            });
          }
        });
      }
    });
    
    var _params = bareMinimumItem.getAttributes(),
        _item = new Item(bareMinimumItem.getType(), false, _params);
    
    
    _.forEach(_options, function(value, attribute){
      _item.addAttribute(attribute, value);
    });
    
    assert.equal(_.size(_broker._getAvailableServices(_item)), _.size(_service));
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  it("checking allocation of dispatch_always services", function(done){
    var _socket = new Socket(function(){});
  
    console.log('BROKER: testing allocation of dispatch_always designated services.');
    
    _request.addReferent(fullItem);

    var _broker = new Broker(_socket, _request),
        _services = _broker._getAvailableServices(emptyItem);
    
    assert.equal(_.size(_broker._addAlwaysRunServices(_services)), dispatchAlwaysServiceCount);
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  it("_filterServicesForClientList", function(done){
    // This feature has not yet been implemented
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  it("checking that service referer blocks are working", function(done){
    var _socket = new Socket(function(){});
  
    console.log('BROKER: testing removal of services that call back out to the referer.');
    
    _request.addReferent(fullItem);

    var _broker = new Broker(_socket, _request),
        _blocks = {},
        _item = new Item(bareMinimumItem.getType(), false, bareMinimumItem.getAttributes());
    
    _.forEach(tierServices, function(services, tier){
      _.forEach(services, function(service){
          if(CONFIGS['services']['tiers'][tier][service]['do_not_call_if_referrer_from']){
            _blocks[service] = CONFIGS['services']['tiers'][tier][service]['do_not_call_if_referrer_from'];
          }
      });
    });
    
    // Get a set of valid attribute values for the service!
    _.forEach(_blocks, function(domains, service){
      if(!_.contains(dispatchAlwaysServices, service)){
        _.forEach(CONFIGS['rules']['objects'][bareMinimumItem.getType()], function(rules, attribute){
          _.forEach(rules, function(services, value){
            if(_.contains(services, service)){
              _item.addAttribute(attribute, value);
            }
          });
        });
      }
      
      _.forEach(domains, function(domain){
        assert(_broker._removeServiceForReferer(getTierNameForService(service), service, [domain]));
        assert(!_broker._removeServiceForReferer(getTierNameForService(service), service, ['blah.edu']));
      });
    });
    

    
    assert.equal(_.size(_broker._addAlwaysRunServices(_services)), dispatchAlwaysServiceCount);
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  it("checking tier preparation", function(done){
    var _socket = new Socket(function(){});
  
    console.log('BROKER: testing assignment of services to their appropriate tier.');
    
    _request.addReferent(fullItem);
    
    var _broker = new Broker(_socket, _request),
        _services = [];
    
    _.forEach(allServices, function(name){
      _services.push(new Service(name));
    });
    
    _broker._prepareTiers(_services, _request.getReferrers());
    
    _.forEach(_broker._tiers, function(tier){
      _.forEach(tier._queue, function(service){
        assert(_.contains(tierServices[tier.getName()], service.getName()));
      });
    });
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  it("checking processing of responses from tiers", function(done){
    console.log('BROKER: testing handling of tier responses.');
    
    _processed = 0;
    
    var interval = setInterval(function(){
      // Make sure each tier completes
      if(_processed >= _.size(tierServices)){
        clearInterval(interval);
        done();
      }
    }, 100);
    
    var _socket = new Socket(function(){
      // Make sure all of the results are in the client JSON format
      _.forEach(_results, function(result){
        if(result.indexOf('"error":') >= 0){
          assert(result.indexOf(CONFIGS['message']['tier_unknown_item_type']) >= 0);
        
        }else{
          assert(result.indexOf('"time":') >= 0);
          assert(result.indexOf('"api_ver":') >= 0);
          assert(result.indexOf('"service":') >= 0);
          assert(result.indexOf('"' + rootItemType + '":') >= 0);
        }
      });
      
      _processed++;
    });
    
    _request.addReferent(fullItem);
  
    var _broker = new Broker(_socket, _request);
  });
  
  // ---------------------------------------------------------------------------------------------------
  it("checking messaging to client", function(done){
    console.log('BROKER: testing item to JSON for client serialization.');
    
    var _processed = 0,
        _total = 0;
    
    var interval = setInterval(function(){
      // Make sure each tier completes
      if(_processed >= _total){
        _.forEach(_results, function(result){
          var json = JSON.parse(result),
              svc = new Service(serviceDisplayNameToName(json.service));
              
          _.forEach(CONFIGS['data']['objects'], function(def, type){
            if(json[type]){
              assert(svc.returnsItemType(type));
            }
          });
        });
        
        clearInterval(interval);
        done();
      }
    }, 100);
    
    var _socket = new Socket(function(){});
    
    _request.addReferent(bareMinimumItem);
  
    var _broker = new Broker(_socket, _request);

    _results = [];
    _total = _.size(_broker._services);

    _.forEach(_broker._services, function(service){
      var _item = new Item(fullItemWithChildren.getType(), false, fullItemWithChildren.getAttributes());
      _broker._sendItemToClient(service.getDisplayName(), _item);
      _processed++;
    });
    
  });

});