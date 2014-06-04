require("../init.js");

var events = require('events'),
    util = require('util'),
    mockery = require('./mockery.js');


// ---------------------------------------------------------------------------------------------------
describe('broker.js', function(){
  this.timeout(10000);
  
  var item = undefined,
      rootItem = '',
      Socket = undefined,
      results = [];
  
  var oldTierProcessMethod = undefined,
      oldTierHasMinimumCitationMethod = undefined;
  
  // ---------------------------------------------------------------------------------------------------
  before(function(done){
    var self = this;
    
    oldTierProcessMethod = Tier.prototype.process;
    oldTierHasMinimumCitationMethod = Tier.prototype._hasMinimumCitation;
    
    // Mock the Tier's process routine to simply send back stub messages
    Tier.prototype.process = function(headers, item){
      var buildItemMap = function(itemType){
        var map = {};

        _.forEach(CONFIGS['data']['objects'][itemType]['attributes'], function(attribute){
          map[attribute] = 'blah';
        });

        _.forEach(CONFIGS['data']['objects'][itemType]['children'], function(child){
          map[child + 's'] = [buildItemMap(child)];
        });

        return map;
      };

      if(headers['error']){
        this.emit('response', {'service': headers['service'], 'original': item, 'new': new Item('error', true, {'message': 'got an error!'})});

      }else if(headers['undefined']){
        var items = [helper.mapToItem(item.getType(), true, buildItemMap(item.getType()))];

        this.emit('response', {'service': headers['service'], 'original': {'foo':'bar'}, 'new': items});

      }else if(headers['fatal']){
        this.emit('error', new Item('error', false, {'level':'fatal','message':'A fatal tier error occurred!'}));

      }else{
        var self = this;

        _.forEach(self._queue, function(service){
          var items = [helper.mapToItem(item.getType(), true, buildItemMap(item.getType()))];

          if(service instanceof Service){
            self.emit('response', {'service': service.getName(), 'original': item, 'new': items});
          }
        });

        self.emit('complete', 'We are done here!');
      }
    };
    // ---------------------------------------------------------------------------------------------------
    // Override Tier level rules checks that do not apply to this test
    Tier.prototype._hasMinimumCitation = function(rules, item){ return true; }

    // ---------------------------------------------------------------------------------------------------
    Item.prototype.setServices = function(services){ this._services = services };
    // ---------------------------------------------------------------------------------------------------
    Item.prototype.getServices = function(services){ return this._services };
    
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      if(def['root']){
        var params = {};
        
        rootItem = type;
        
        _.forEach(def['validation'], function(attribute){
          params[attribute] = 'got it';
        })
        
        item = new Item(type, false, params);
      }
    });
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  after(function(done){
    // Remove all monkey patches and set Tier and Item back to original state!
    Tier.prototype.process = oldTierProcessMethod;
    Tier.prototype._hasMinimumCitation = oldTierHasMinimumCitationMethod;
    
    Item.prototype.getServices = undefined;
    Item.prototype.setServices = undefined;
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  beforeEach(function(done){
    results = [];
    
    Socket = function(callback){
      var self = this;
      
      // Call the constructor for EventEmitter
      events.EventEmitter.call(self);
      
      self.handshake = self.buildHandshake();

      self.on('complete', function(message){
        callback();
      });
      
      _.forEach(CONFIGS['data']['objects'], function(def, type){
        self.on(type, function(json){
          results.push(json);
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
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  it("should throw an error if the socket or item is missing.", function(done){
    socket = new Socket(done);
    
    console.log('BROKER: checking errors are thrown for bad socket/item.');
    
    assert.throws(function(){ new Broker(undefined, undefined); });
    assert.throws(function(){ new Broker(undefined, item); });
    assert.throws(function(){ new Broker(socket, undefined); });
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  it("should return bad item errors for unknown item types or invalid items", function(done){
    console.log('BROKER: check invalid item handling.');
    
    socket = new Socket(function(){
      assert.equal(0, _.size(results));
      
      done();
    });
    socket.handshake.headers['referer'] = 'http://www/google.com';
    
    var broker = new Broker(socket, new Item(rootItem, false, {'foo':'bar'}));
  });
  
  // ---------------------------------------------------------------------------------------------------
  it("should always include the 'always_dispatch' services", function(done){
    var self = this;
  
    console.log('BROKER: checking that the services in rules.yaml -> dispatch_always are always called.');
  
    self.responses = 0;
    self.types = {};
    
    // Count the number of items that can be returned for each of the services (mock tier will only return 1 of each item)
    _.forEach(CONFIGS['rules']['dispatch_always'], function(service){
      _.forEach(CONFIGS['services']['tiers'], function(defs, tier){
        _.forEach(defs, function(def, svc){
          if(svc == service){
            
            _.forEach(def['items_types_returned'], function(type){
              self.types[type] = (typeof self.types[type] == 'undefined' ? 1 : (self.types[type] + 1))
              self.responses++;
            });
          }
        });
      });
    });
    
    socket = new Socket(function(){
      // Make sure the right number of responses were fired
      assert.equal(self.responses, _.size(results));
      
      // Make sure the right types of items were sent by counting down each type
      _.forEach(results, function(result){
        var json = JSON.parse(result);
        
        _.forEach(self.types, function(count, type){
          if(typeof json[type] != 'undefined'){
            self.types[type]--;
          }
        })
      });
      
      // All item types should have been checked off
      _.forEach(self.types, function(count, type){
        assert.equal(0, count);
      });
      
      done();
    });
    socket.handshake.headers['referer'] = 'http://www/google.com';
    
    var broker = new Broker(socket, item);
  });
  
  // ---------------------------------------------------------------------------------------------------
  it("should remove services that belong to the current referer", function(done){
    var referer = {},
        self = this;
        
    console.log('BROKER: Making sure that services are removed if the referer matches those defined in services.yaml');
    
    // Find services that has referer restrictions
    _.forEach(CONFIGS['services']['tiers'], function(svcs, tier){
      _.forEach(svcs, function(def, svc){
        if(typeof def['do_not_call_if_referrer_from'] != 'undefined'){
          referer[svc] = _.first(def['do_not_call_if_referrer_from']);
        }
      });
    });
    
    var count = _.size(referer);
    
    _.forEach(referer, function(referer, service){
    
      socket = new Socket(function(){      
        var passed = true;
        
        // Make sure the right types of items were sent by counting down each type
        _.forEach(results, function(result){
          var json = JSON.parse(result);
        
          if(json['service'] == self.service){
            passed = false;
          }
        });
        
        if(!passed) console.log('referer, ' + referer + ', check should have blocked ' + service + ' from returning results!');
        assert(passed);
        if(count <= 1){
          done();
        }
      
        count--;
      });
      
      socket.handshake.headers['referer'] = (referer.indexOf('http://') >= 0 ? referer : 'http://' + referer);
    
      var broker = new Broker(socket, item);
      
    });
  });
  
  
});