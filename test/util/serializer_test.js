require('../../init.js');
    
var uuid = require('node-uuid');
    
describe("serializer.js", function(){
  
  var getAttributeMap = undefined,
      item = undefined,
      itemWithKids = undefined,
      rootItem = '',
      client_api_ver = '',
      service_api_ver = '';
  
  // ---------------------------------------------------------------------------------------------------
  before(function(done){
    // Wait for the config file and init.js have finished loading before starting up the server
    var delayStartup = setInterval(function(){
      if(typeof Item != 'undefined'){
        clearInterval(delayStartup);
            
        client_api_ver = CONFIGS['application']['client_api_version'];
        service_api_ver = CONFIGS['application']['service_api_version'];
    
        getAttributeMap = function(type, include_children){
          var map = {},
              self = this;

          if(typeof CONFIGS['data']['objects'][type] != 'undefined'){
        
            _.forEach(CONFIGS['data']['objects'][type]['attributes'], function(attribute){
              map[attribute] = 'foo-bar';
            });
    
            if(include_children){
              if(typeof CONFIGS['data']['objects'][type]['children'] != 'undefined'){
                _.forEach(CONFIGS['data']['objects'][type]['children'], function(child){
                  map[child + 's'] = [getAttributeMap(child)];
                });
              }
            }
          }
  
          return map;
        };
    
        _.forEach(CONFIGS['data']['objects'], function(def, type){
          if(typeof def['root'] != 'undefined'){
            rootItem = type;
            item = new Item(type, false, getAttributeMap(type, false));
            itemWithKids = new Item(type, false, getAttributeMap(type, true));
          }
        });
    
        done();
      }
    }, 200);
  });
  
  
  // ---------------------------------------------------------------------------------------------------
  it('testing itemToJsonForClient()', function(){
    
    console.log('SERIALIZER: checking item to JSON for client');
    
    var json = JSON.parse(serializer.itemToJsonForClient('test_svc', item));
    
    assert.equal('undefined', (typeof json['foo']));
    assert.equal('string', (typeof json['time']));
    assert.equal(client_api_ver, json['api_ver']);
    assert.equal('test_svc', json['service']);
    
    _.forEach(item.getAttributes(), function(value, key){
      if(value instanceof Array){
        assert.equal(_.size(value), _.size(json[rootItem][key]));
      }else{
        assert.equal(value, json[rootItem][key]);
      }
    });
    
    json = JSON.parse(serializer.itemToJsonForClient('test_svc', itemWithKids));
  
    assert.equal('undefined', (typeof json['foo']));
    assert.equal('string', (typeof json['time']));
    assert.equal(client_api_ver, json['api_ver']);
    assert.equal('test_svc', json['service']);
    
    _.forEach(item.getAttributes(), function(value, key){
      if(value instanceof Array){
        assert.equal(_.size(value), _.size(json[rootItem][key]));
      }else{
        assert.equal(value, json[rootItem][key]);
      }
    });
    
  });
  
  // ---------------------------------------------------------------------------------------------------
  it('testing itemToJsonForService()', function(){
    var transId = uuid.v4();
    
    console.log('SERIALIZER: checking item to JSON for services');
    
    var json = JSON.parse(serializer.itemToJsonForService(transId, item));
    
    assert.equal('undefined', (typeof json['foo']));
    assert.equal('string', (typeof json['time']));
    assert.equal('undefined', (typeof json['api_ver']));
    assert.equal(transId, json['id']);
    
    _.first(json[rootItem + 's'], function(item){
      _.forEach(item.getAttributes(), function(value, key){
        if(value instanceof Array){
          assert.equal(_.size(value), _.size(item[key]));
        }else{
          assert.equal(value, item[key]);
        }
      });
    });
    
    itemWithKids.addAttribute('foo', 'bar');
    json = JSON.parse(serializer.itemToJsonForService(transId, itemWithKids));
  
    assert.equal('undefined', (typeof json['foo']));
    assert.equal('string', (typeof json['time']));
    assert.equal('undefined', (typeof json['api_ver']));
    assert.equal(transId, json['id']);
    
    _.first(json[rootItem + 's'], function(item){
      assert.equal(1, _.size(item.getAttribute('additional')));

      _.forEach(item.getAttributes(), function(value, key){
        if(value instanceof Array){
          assert.equal(_.size(value), _.size(item[key]));
        }else{
          assert.equal(value, item[key]);
        }
      });
    });

    // With request params
    var json = JSON.parse(serializer.itemToJsonForService(transId, item, {"api_ver": service_api_ver, 
                                                                          "referrer": "google.com", 
                                                                          "requestor_ip": "127.0.0.1",
                                                                          "requestor_affiliation": "CAMPUS-A",
                                                                          "unmapped": "foo=bar&yadda=yadda"}));
    
    assert.equal('undefined', (typeof json['foo']));
    assert.equal('string', (typeof json['time']));
    assert.equal(service_api_ver, json['api_ver']);
    assert.equal("google.com", json['referrer']);
    assert.equal("127.0.0.1", json['requestor_ip']);
    assert.equal("CAMPUS-A", json['requestor_affiliation']);
    assert.equal("foo=bar&yadda=yadda", json['unmapped']);
    assert.equal(transId, json['id']);
    
    _.first(json[rootItem + 's'], function(item){
      _.forEach(item.getAttributes(), function(value, key){
        if(value instanceof Array){
          assert.equal(_.size(value), _.size(item[key]));
        }else{
          assert.equal(value, item[key]);
        }
      });
    });


    // Flattened JSON ouput with child items AND additional attribute hash
    itemWithKids.addAttribute('foo', 'bar');
    json = JSON.parse(serializer.itemToJsonForService(transId, itemWithKids, {"api_ver": service_api_ver, 
                                                                              "referrer": "google.com", 
                                                                              "requestor_ip": "127.0.0.1",
                                                                              "requestor_affiliation": "CAMPUS-A",
                                                                              "unmapped": "foo=bar&yadda=yadda"}));
  
    assert.equal('undefined', (typeof json['foo']));
    assert.equal('string', (typeof json['time']));
    assert.equal(service_api_ver, json['api_ver']);
    assert.equal("google.com", json['referrer']);
    assert.equal("127.0.0.1", json['requestor_ip']);
    assert.equal("CAMPUS-A", json['requestor_affiliation']);
    assert.equal("foo=bar&yadda=yadda", json['unmapped']);
    assert.equal(transId, json['id']);
    
    _.first(json[rootItem + 's'], function(item){
      assert.equal(1, _.size(item.getAttribute('additional')));

      _.forEach(item.getAttributes(), function(value, key){
        if(value instanceof Array){
          assert.equal(_.size(value), _.size(item[key]));
        }else{
          assert.equal(value, item[key]);
        }
      });
    });

  });


  // ---------------------------------------------------------------------------------------------------
  it('testing requestorToJson()', function(){
		console.log("SERIALIZER: checking requestor to JSON for reports");
		
    var requestor = new Requestor();
    
    var json = JSON.parse(serializer.requestorToJson(requestor));
    
    assert.equal('undefined', typeof json.affiliation);
		assert.equal('undefined', typeof json.ip);
		assert.equal('undefined', typeof json.language);
		assert.equal('undefined', typeof json.agent);
		assert(_.size(json.identifiers) <= 0);
		
    requestor = new Requestor({"affiliation": "CAMPUS-A",
			                          "ip": "127.0.0.1",
			                          "agent": "Chrome",
			                          "language": "en",
			                          "identifiers": ["ABC","123"]});
		
		var json = JSON.parse(serializer.requestorToJson(requestor));
		
    assert.equal('CAMPUS-A', json.affiliation);
		assert.equal('127.0.0.1', json.ip);
		assert.equal('en', json.language);
		assert.equal('Chrome', json.agent);
		assert.equal(2, _.size(json.identifiers));
	});
	

  // ---------------------------------------------------------------------------------------------------
  it('testing requestToJson()', function(){
		console.log("SERIALIZER: checking request to JSON for reports");
		
    var request = new Request();
    
    var json = JSON.parse(serializer.requestToJson(request));
    
    assert(typeof json.start_time != 'undefined');
    assert(typeof json.request_id != 'undefined');

    assert.equal('undefined', json.end_time);
    assert.equal('undefined', json.service_api_ver);
    assert.equal('undefined', json.client_api_ver);
    assert(_.size(json.requestor) <= 0);
    assert.equal('undefined', json.request_type);
    assert.equal('undefined', json.request_content_type);
    assert.equal('undefined', json.unmapped);
    assert.equal('undefined', json.request);
    assert.equal('undefined', json.duration);
    
    assert(typeof json.errors == 'undefined');
    assert(typeof json.referents == 'undefined');
    assert(_.size(json.referrers) <= 0);
    
    request = new Request({"referrers": ["www.domain.org"],
                          "affiliation": "CAMPUS-A",
                          "ip": "127.0.0.1",
                          "agent": "Chrome",
                          "language": "en",
                          "type": "test",
                          "content_type": "text/plain",
                          "request": "foo=bar&yadda=yadda&blah=blah&abc=123",
                          "unmapped": "foo=bar&yadda=yadda",
                          "client_api_version": "0.1",
                          "service_api_version": "0.2"});

    request.setEndTime(new Date());
    json = JSON.parse(serializer.requestToJson(request));
    
    assert(typeof json.start_time != 'undefined');
    assert(typeof json.request_id != 'undefined');
    assert(typeof json.end_time != 'undefined');
    assert(typeof json.duration != 'undefined');
    assert.equal('0.2', json.service_api_ver);
    assert.equal('0.1', json.client_api_ver);
    assert(_.size(json.referrers) == 1);
    assert.equal('www.domain.org', json.referrers[0]);
    assert.equal('CAMPUS-A', json.requestor.affiliation);
    assert.equal('127.0.0.1', json.requestor.ip);
    assert.equal('en', json.requestor.language);
    assert.equal('Chrome', json.requestor.agent);
    assert.equal('test', json.request_type);
    assert.equal('text/plain', json.request_content_type);
    assert.equal('foo=bar&yadda=yadda', json.unmapped);
    assert.equal('foo=bar&yadda=yadda&blah=blah&abc=123', json.request);
    
    assert(typeof json.errors == 'undefined');
    assert(typeof json.referents == 'undefined');
    
    request.addError(new Error('test'));
    request.addReferent({"foo":"bar"});
    request.addReferrer({"yadda":"yadda"});
    
    json = JSON.parse(serializer.requestToJson(request));
    
    assert.equal(1, _.size(json.errors));
    assert.equal(1, _.size(json.referents));
    assert.equal(2, _.size(json.referrers));
  });
  
});

