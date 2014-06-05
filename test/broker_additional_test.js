require("../init.js");

var events = require('events'),
    util = require('util');

// ---------------------------------------------------------------------------------------------------
describe('broker_additional_test.js', function(){
  this.timeout(40000);
  
  var Socket = undefined,
      item = undefined,
      rootItem = '',
      results = [];
      
  var oldServiceReturnsItemTypeMethod = undefined,
      oldTierProcessMethod = undefined,
      oldTierHasMinimumCitation = undefined; 
  
  // ---------------------------------------------------------------------------------------------------
  before(function(done){
    var self = this;
    
    oldServiceReturnsItemTypeMethod = Service.prototype.returnsItemType;
    oldTierProcessMethod = Tier.prototype.process;
    oldTierHasMinimumCitation = Tier.prototype._hasMinimumCitation;
    
    // ---------------------------------------------------------------------------------------------------
    Item.prototype.setServices = function(services){ this._services = services };
    // ---------------------------------------------------------------------------------------------------
    Item.prototype.getServices = function(){ return this._services };
    // ---------------------------------------------------------------------------------------------------
    Item.prototype.setServiceDisplays = function(displays){ this._displays = displays };
    // ---------------------------------------------------------------------------------------------------
    Item.prototype.getServiceDisplays = function(){ return this._displays };

    // ---------------------------------------------------------------------------------------------------
    // Override Tier and Service level rules checks that do not apply to this test
    Tier.prototype._hasMinimumCitation = function(rules, item){ return true; }
    Service.prototype.returnsItemType = function(type){ return true; }
    
    
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
    
    // Mock the Tier's process routine to simply send back stub messages
    Tier.prototype.process = function(headers, item){
      var self = this;

      _.forEach(self._queue, function(service){
        if(service instanceof Service){
          self.emit('response', {'service': service.getDisplayName(), 'original': item, 'new': [new Item(item.getType(), true, {'foo':'bar'})]});
        }
      });

      self.emit('complete', 'We are done here!');
    };
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  after(function(done){
    // Remove all monkey patching and return Service, Tier, and Item back to their original state!
    Service.prototype.returnsItemType = oldServiceReturnsItemTypeMethod;
    
    Tier.prototype.process = oldTierProcessMethod;
    Tier.prototype._hasMinimumCitation = oldTierHasMinimumCitation;
    
    Item.prototype.setServices = undefined;
    Item.prototype.getServices = undefined;
    
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
  it("should only setup the appropriate services for the item attribute rules", function(done){

    console.log('BROKER: Making sure that the appropriate services respond for the appropriate item-attribute combinations.');
    
    var always = {},
        items = [];
    
    var buildItems = function(rules, type){
      var options = {},
          ret = [];
      
      // Collect all of the attributes and their potential values
      _.forEach(rules, function(values, attribute){
        _.forEach(values, function(services, value){
          if(typeof options[attribute] == 'undefined') options[attribute] = [];
          options[attribute].push(value);
        });
      });
      
      // Calculate the total number of possible attribute sets
      var total = 1;
      _.forEach(options, function(vals, attr){
        total = total * vals.length;
      });
      
      var params = [],
          bookmark = {};
      
      // Loop through the attributes and add the values to each of the parameter sets
      _.forEach(options, function(values, attr){
        var bookmark = 0;
        
        for(var i = 0; i < total; i++){
          if(bookmark > (values.length - 1)){ bookmark = 0; }
          
          var it = (typeof params[i] == 'undefined') ? {'additional': []} : params[i];
          
          it[attr] = values[bookmark];
          
          // Set any attributes required for validation that do not have a rule here!
          _.forEach(CONFIGS['data']['objects'][type]['validation'], function(attribute){
            if(typeof it[attribute] == 'undefined'){
              it[attribute] = 'foo-bar';
            }
          });
          
          params[i] = it;
          
          bookmark++;
        }
      });
      
      // Build out an item for each of the attribute sets
      _.forEach(params, function(paramSet){
        // Add the services that should respond to the additional array so we can verify the tests
        var svcs = undefined;

        _.forEach(options, function(values, attribute){
          
          if(typeof svcs == 'undefined'){
            svcs = CONFIGS['rules']['objects'][type][attribute][paramSet[attribute]];
            
          }else{
            var newList = [];
            
            _.forEach(svcs, function(service){
              if(_.contains(CONFIGS['rules']['objects'][type][attribute][paramSet[attribute]], service)){
                newList.push(service);
              }
              
            });
            
            svcs = newList;
          }
        });
        
        // Throw the always dispatch services into the list
        _.forEach(CONFIGS['rules']['dispatch_always'], function(service){
          svcs.push(service);
        });
        
        //console.log(paramSet['genre'] + ', ' + paramSet['content_type'] + ' --> ' + svcs);
        
        var item = new Item(type, false, paramSet)
        item.setServices(svcs);
        
        // Convert the service names over to display names so we can match them up later
        var displays = [];
        _.forEach(svcs, function(svc){
          _.forEach(CONFIGS['services']['tiers'], function(services, tier){
            _.forEach(services, function(def, service){
              if(svc == service){
                displays.push((typeof def['display_name'] == 'undefined' ? svc : def['display_name']));
              }
            });
          });  
        });
        item.setServiceDisplays(displays);
        
        ret.push(item);
      });
      
      return ret;
    };
    // -------------------------------------------------------
    
    // Count the number of items that can be returned for each of the services (mock tier will only return 1 of each item)
    _.forEach(CONFIGS['rules']['dispatch_always'], function(service){
      _.forEach(CONFIGS['services']['tiers'], function(defs, tier){
        _.forEach(defs, function(def, svc){
          if(svc == service){
            
            _.forEach(def['items_types_returned'], function(type){
              always[type] = (typeof always[type] == 'undefined' ? 1 : (always[type] + 1))
            });
          }
        });
      });
    });
    
    var complete = 1;
    
    _.forEach(CONFIGS['rules']['objects'], function(rules, type){
      items = buildItems(rules, type);

      var dispatchItem = function(index, callback){
        if(items[index] instanceof Item){
          var responses = _.size(items[index].getServices()); //_.size(always) + _.size(items[index].getServices());
        
          if(typeof items[index] != 'undefined'){
          
            socket = new Socket(function(){
              console.log('checking services responding to: genre: ' + items[index].getAttribute('genre') + ', content_type: ' + items[index].getAttribute('content_type'));
//              console.log(results);
        
              // Make sure the right number of responses were fired
              assert.equal(responses, _.size(results));
            
              _.forEach(results, function(result){
                var json = JSON.parse(result);
                var passed = true;

                if(!_.contains(items[index].getServiceDisplays(), json['service']) && !_.contains(CONFIGS['rules']['dispatch_always'], json['service'])){
                  console.log('Incorrect service, ' + json['service'] + ' responded for genre: ' + items[index].getAttribute('genre') + ', content_type: ' + items[index].getAttribute('content_type'));
                  passed = false;
                }
                
                assert(passed);
              });
            
              results = [];
              dispatchItem(index + 1, callback);
            });

            socket.handshake.headers['referer'] = 'http://domain.edu';

            var broker = new Broker(socket, items[index]);
          
          }else{
            callback();
          }
          
        }else{
          done();
        }
      };
      
      // Dispatch each item in turn
      dispatchItem(0, function(){
        
      });

    }); 
    
    
  });
  
});