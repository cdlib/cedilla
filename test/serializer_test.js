require('../init.js');
    
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
  });
  
  
  // ---------------------------------------------------------------------------------------------------
  it('testing itemToJsonForClient()', function(){
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
    var json = JSON.parse(serializer.itemToJsonForService(transId, item));
    
    assert.equal('undefined', (typeof json['foo']));
    assert.equal('string', (typeof json['time']));
    assert.equal(service_api_ver, json['api_ver']);
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
    
    json = JSON.parse(serializer.itemToJsonForService(transId, itemWithKids));
  
    assert.equal('undefined', (typeof json['foo']));
    assert.equal('string', (typeof json['time']));
    assert.equal(service_api_ver, json['api_ver']);
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
    
  });
  
});

