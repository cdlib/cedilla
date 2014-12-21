require('../../lib');
        
describe('item.js', function(){
  var attributes = {},
      defaultValue = 'foo-bar';
  
  // ------------------------------------------------------------------------------------------------------  
  before(function(done){
    // Wait for the config file and initial have finished loading before starting up the server
    var delayStartup = setInterval(function(){
      if(typeof Item != 'undefined'){
        clearInterval(delayStartup);
        
        _.forEach(CONFIGS['data']['objects'], function(def, type){
          var attrs = {};
      
          _.forEach(def['attributes'], function(attribute){
            attrs[attribute] = defaultValue;
          });
      
          attributes[type] = attrs;
        });
    
        done();
      }
    });
  });
  
// ------------------------------------------------------------------------------------------------------  
// Initialization
// ------------------------------------------------------------------------------------------------------
  // Missing type throws error
  it('should throw an error when the type is not specified!', function(){
    
    console.log('ITEM: checking that error is thrown when no type specified');
    
    assert.throws(function(){ new Item(undefined, false, {}); });
  });
    
  // ------------------------------------------------------------------------------------------------------
  // Invalid type throws error
  it('should throw an error when the type is not defined in the ./config/data.config!', function(){
    
    console.log('ITEM: checking that error is thrown when no type specified');
    
    assert.throws(function(){ new Item(undefined, false, {}); });
  });
  
  // ------------------------------------------------------------------------------------------------------  
  // Valid item types do NOT throw errors
  it('should NOT throw an error when the type is defined in the ./config/data.config!', function(){
    
    console.log('ITEM: checking that error is NOT thrown when no type specified');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      assert.doesNotThrow(function(){ new Item(type, false, {}); });
      assert.doesNotThrow(function(){ new Item(type, true, {}); });
      assert.doesNotThrow(function(){ new Item(type, false, attributes); });
      assert.doesNotThrow(function(){ new Item(type, true, attributes); });
    });
  });

  // ------------------------------------------------------------------------------------------------------  
  // defaults off returns empty object
  it('should have no attributes when defaults are turned off and no attributes were supplied!', function(){
    
    console.log('ITEM: checking that an empty item with no attributes can be created');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      var item = new Item(type, false, {});
      assert.equal(0, _.size(item.getAttributes()));
    });
  });
  
  // ------------------------------------------------------------------------------------------------------    
  // defaults on returns object with only defaults
  it('should have a unique identifier', function(){
    var ids = [];
    
    console.log('ITEM: Making sure items receive a unique identifier on creation');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      for(var i = 0; i < 20; i++){
        var it = new Item(type, false, {});
        
        assert(!_.contains(ids, it.getId()));
        
        ids.push(it.getId());
      }
    });
  });

  // ------------------------------------------------------------------------------------------------------    
  // defaults on returns object with only defaults
  it('should have an attribute for each default defined in ./config/data.yaml!', function(){
    
    console.log('ITEM: checking that defaults are set properly');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
    
      var item = new Item(type, true, {});
      
      if(typeof def['default'] != 'undefined'){
        assert.equal(_.size(def['default']), _.size(item.getAttributes()));
        
        _.forEach(def['default'], function(value, key){
          assert.equal(value, item.getAttribute(key));
        });
      }
      
    });
  });
    
  // ------------------------------------------------------------------------------------------------------  
  // attribute assignment working
  it('should have an attribute for each attribute specified!', function(){
    
    console.log('ITEM: checking that all attributes defined get created properly');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      var item = new Item(type, false, attributes[type]);
      
      assert.equal(_.size(attributes[type]), _.size(item.getAttributes()));
        
      _.forEach(attributes[type], function(value, key){
        assert.equal(value, item.getAttribute(key));
      });
    });
  });
    
  
// ------------------------------------------------------------------------------------------------------  
// IsValid()
// ------------------------------------------------------------------------------------------------------
  it('testing for invalid items', function(){
    
    console.log('ITEM: checking item validation');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      if(typeof def['validation'] != 'undefined'){
        var item = new Item(type, true, {});
        
        // Assert that not setting ANY of the validation attributes fails
        assert(!item.isValid());
      }
    });
  });
    
  // ------------------------------------------------------------------------------------------------------  
  it('testing for valid items', function(){
    
    console.log('ITEM: checking item validation policies');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      var attributes = {};
      
      // Set a value for each attribute defined in the items validation config
      if(typeof def['validation'] != 'undefined'){
        _.forEach(def['validation'], function(attr){
          if(attr instanceof Array){
            _.forEach(attr, function(a){
              attributes[a] = 'bar';
            });
          
          }else{
            attributes[attr] = 'foo';
          }
        });
      }
      
      var item = new Item(type, true, attributes);
      
      assert(item.isValid());
    });
  });
  
// ------------------------------------------------------------------------------------------------------
// Attribute Methods
// ------------------------------------------------------------------------------------------------------
  // has attributes
  it('testing hasAttributes()', function(){
    
    console.log('ITEM: testing hasAttributes');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      var item = new Item(type, false, attributes[type]);
      
      assert(_.size(item.getAttributes()) > 0);
      assert(_.size(item.getAttributes()) == _.size(attributes[type]));
    });
  });
  
  // ------------------------------------------------------------------------------------------------------
  // has attribute
  it('testing hasAttribute()', function(){
    
    console.log('ITEM: testing hasAttribute for specific attributes');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      var item = new Item(type, false, attributes[type]);
      
      _.forEach(attributes[type], function(value, key){
        assert(item.hasAttribute(key));
      });
    
      assert(!item.hasAttribute('bar'));
    });
  });
  
  // ------------------------------------------------------------------------------------------------------    
  // add attribute
  it('testing addAttribute()', function(){
    
    console.log('ITEM: checking that individual attributes can be added');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      var item = new Item(type, false, {});
      
      _.forEach(attributes[type], function(value, key){
        item.addAttribute(key, value);
        
        assert(item.hasAttribute(key));
        assert(item.getAttribute(key) == value);
      })

    });
  });
      
  // ------------------------------------------------------------------------------------------------------
  // set attributes in bulk
  it('testing addAttributes()', function(){
    
    console.log('ITEM: checking that attributes can be added as a map');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      var item = new Item(type, false, {});
      
      item.addAttributes(attributes[type]);
  
      _.forEach(attributes[type], function(value, key){
        assert(item.getAttribute(key) == value);
      });
    });
  });
    
  // ------------------------------------------------------------------------------------------------------
  // remove attribute
  it('testing removeAttribute()', function(){
    
    console.log('ITEM: checking that attributes can be removed');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      var item = new Item(type, false, attributes[type]);
      
      _.forEach(attributes[type], function(value, key){
        item.removeAttribute(key);
  
        assert(!item.hasAttribute(key));
        assert(typeof item.getAttribute(key) == 'undefined');
      });
    });
  });
    
  // ------------------------------------------------------------------------------------------------------
  // get value
  it('testing getAttribute()', function(){
    
    console.log('ITEM: checking that attributes can be retrieved by name');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      var item = new Item(type, false, attributes[type]);
      
      _.forEach(attributes[type], function(value, key){
        assert(item.getAttribute(key) == value);
      });
    
      assert(typeof item.getAttribute('foobar') == 'undefined');
    });
  });
    
  // ------------------------------------------------------------------------------------------------------
  // check adding child items
  it('testing addAttribute() and removeAttribute() for array of child items', function(){
    
    console.log('ITEM: testing add and remove of child items');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      if(typeof def['children'] != 'undefined'){
        var item = new Item(type, false, attributes[type]);
        var children = {};
      
        var i = 0;
        _.forEach(def['children'], function(child){
          children[child + 's'] = new Item(child, true, attributes[child]);
        });
        
        _.forEach(children, function(kid, name){
          item.addAttribute(name, [kid]);
          
          assert(item.hasAttribute(name));
          
          assert.equal(1, _.size(item.getAttribute(name)));
          
          _.forEach(item.getAttribute(name), function(child){
            assert(_.size(child.getAttributes()) == _.size(attributes[child.getType()]));
            
            _.forEach(child.getAttributes(), function(v, k){
              assert(child.getAttribute(k) == attributes[child.getType()][k]);
            });
            
          });
          
          item.removeAttribute(name);
    
          assert(!item.hasAttribute(name));
        });
    
      }
    });
  });
    
  
  // ------------------------------------------------------------------------------------------------------
  // to String
  it('testing toString()', function(){
    
    console.log('ITEM: checking toString');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      var item = new Item(type, false, attributes[type]);
    
      var test = '';
      _.forEach(attributes[type], function(value, key){
        test += '"' + key + '" = "' + value + '", ';
      });
    
      assert(item.toString().trim() == test.slice(0, -2).trim());
    });
  });

  // ------------------------------------------------------------------------------------------------------
  // checking Transaction management
  it('testing getTransactions() and addTransaction()', function(){
    
    console.log('ITEM: checking getTransactions() and addTransaction()');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      var item = new Item(type, false, {});
    
      for(var i = 0; i < 5; i++){
        item.addTransaction({'foo':'bar','val': i.toString()});
      }
      
      assert.equal(5, _.size(item.getTransactions()));
    });
  });

});
