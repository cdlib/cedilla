require("../index.js");

var events = require('events');
		
describe('tier.js', function(){
	this.timeout(10000);
	
	var getAttributeMap = undefined,
			processTier = undefined,
			tiers = [];
	
	// ---------------------------------------------------------------------------------------------------
	before(function(done){
    getAttributeMap = function(type, value){
      var map = {};

      if(typeof CONFIGS['data']['objects'][type] != 'undefined'){
        
        _.forEach(CONFIGS['data']['objects'][type]['attributes'], function(attribute){
          map[attribute] = value;
        });
    
        if(typeof CONFIGS['data']['objects'][type]['children'] != 'undefined'){
          _.forEach(CONFIGS['data']['objects'][type]['children'], function(child){
            map[child + 's'] = [getAttributeMap(child, value)];
          });
        }
      }
  
      return map;
    };
		
		// ----------------------------------------------------------------------
		processTier = function(socket, item, additionalServices, index, callback){
			if(tiers[index]){
		    console.log('Processing tier ' + tiers[index].getName());
    
		    tiers[index].negotiate(socket, item, function(augmentedItem, leftoverServices){
		      // If there were leftover services and there are other tiers, add the services to the next tier
		      if(!_.isEmpty(leftoverServices) && tiers[index + 1] instanceof Tier){
		        tiers[index + 1].addServices(leftoverServices);
		      }
				
		      return processTier(socket, augmentedItem, leftoverServices, (index + 1), callback);
		    });
				
		  } else {
		    callback();
		  }
		};
		
		// ----------------------------------------------------------------------
		// Build out the tiers and their services as defined in the config
		_.forEach(CONFIGS['services']['tiers'], function(svcs, tier){
			var mockServices = [];
			
			_.forEach(svcs, function(def, name){
				mockServices.push(new Service(name));
			});
			
			tiers.push(new Tier(tier, mockServices));
		});
		
		done();
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should throw an error if no services are supplied!', function(){
		assert.throws(function(){ new Tier('tester', undefined) });
		assert.throws(function(){ new Tier('tester', '') });
		assert.throws(function(){ new Tier('tester', {}) });
		
		assert(new Tier('tester', []) instanceof Tier);
		assert(new Tier('tester', ['svc_test']) instanceof Tier);
		assert(new Tier('tester', ['svc_test1', 'svc_test2']) instanceof Tier);
		assert(new Tier('tester', [new Service('test')]) instanceof Tier);
	});

	// ---------------------------------------------------------------------------------------------------
	it('should return the name and the service count!', function(){
		var tier = new Tier('test', [new Service('one'), new Service('two'), new Service('three')]);
		
		assert.equal('test', tier.getName());
		assert.equal(3, tier.getServiceCount());
		
		tier.addServices([new Service('foo'), new Service('bar')]);
		assert.equal(5, tier.getServiceCount());
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should negotiate but be unable to call any of the services due to minimum citation check', function(done){
		var socket = new events.EventEmitter(),
				messages = [],
				item = undefined;
		
		// Create a socket event for each data type.
		_.forEach(CONFIGS['data']['objects'], function(def, type){
			if(typeof def['root'] != 'undefined'){
				item = helper.mapToItem(type, false, {'foo':'bar'});
			}
			
			socket.on(type, function(data){
				console.log(data);
				messages.push(data);
			});
		});
		
		socket.on('complete', function(data){
			assert.equal(1, _.size(messages));
			done();
		});
			
		processTier(socket, item, [], 0, function(){
			socket.emit('complete', CONFIGS['message']['broker_response_success']);
		});
			
	});
	
	// ---------------------------------------------------------------------------------------------------
	/*it('should negotiate and return the augmented item', function(done){
		var socket = new events.EventEmitter(),
				messages = [],
				item = undefined;
		
		// Create a socket event for each data type.
		_.forEach(CONFIGS['data']['objects'], function(def, type){
			if(def['root'] == true){
				item = helper.mapToItem(type, false, getAttributeMap(type, 'yadda'));
			}
			
			socket.on(type, function(data){
//				console.log('received: ' + data + '\n\n');
				messages.push(data);
			});
		});
		
		socket.on('complete', function(data){
			console.log(_.size(messages) + ' messages received');
			assert.equal(3, _.size(messages));
			done();
		});
			
		tiers = _.sortBy(tiers, function(item){ return item.getName() });
		
		console.log('kick off');
		
		processTier(socket, item, [], 0, function(){
			socket.emit('complete', CONFIGS['message']['broker_response_success']);
		});
			
	});*/
	
});


// ---------------------------------------------------------------------------------------------------
// mock the actual call to the service
// ---------------------------------------------------------------------------------------------------
Tier.prototype._callService = function(service, item, headers, callback){
  var obj = undefined;
	
	buildItemMap = function(type, value){
    var map = {};

    if(typeof CONFIGS['data']['objects'][type] != 'undefined'){
      
      _.forEach(CONFIGS['data']['objects'][type]['attributes'], function(attribute){
        map[attribute] = value;
      });
  
      if(typeof CONFIGS['data']['objects'][type]['children'] != 'undefined'){
        _.forEach(CONFIGS['data']['objects'][type]['children'], function(child){
          map[child + 's'] = [buildItemMap(child, value)];
        });
      }
    }

    return map;
	}
	
	// Build the response objects
	if(service.getName() == 'error'){
		obj = helper.mapToItem('error', false, {'level' : 'warning', 'message': 'you got an error!'});
		
	}else{
		_.forEach(CONFIGS['data']['objects'], function(def, type){

			if(typeof def['root'] != 'undefined'){
				obj = helper.mapToItem(type, false, buildItemMap(type, 'blah'));
			
			}else{
				obj.addAttribute(type + 's', [helper.mapToItem(type, false, buildItemMap(type, 'foo')), 
																			 helper.mapToItem(type, false, buildItemMap(type, 'bar'))]);
			}
		});
	}
	
	callback(obj);
};