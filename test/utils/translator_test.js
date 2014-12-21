require('../../lib');

describe('translator.js', function(){
  var attributes = {'foo':'bar', 'one':'fish', 'two':'fish', 'red':'fish', 'blue':'fish'};
    
    
  before(function(done){
    // Wait for the config file and initial modules have finished loading before starting up the server
    var delayStartup = setInterval(function(){
      if(typeof Item != 'undefined'){
        clearInterval(delayStartup);
        
        done();
      }
    });
  });
  
// ------------------------------------------------------------------------------------------------------
// Initialization Tests
// ------------------------------------------------------------------------------------------------------
  it("should initialize without a mapping file defined!", function(){
    
    console.log('TRANSLATOR: checking initialization without a mapping file specified');
    
    assert.doesNotThrow(function(){ new Translator(undefined); });
    assert.doesNotThrow(function(){ new Translator(' '); });
  });
    
  // ------------------------------------------------------------------------------------------------------
  it("should NOT initialize with a missing mapping file defined!", function(){
    
    console.log('TRANSLATOR: verifying failure when mapping file specified does not exist');
    
    assert.throws(function(){ new Translator('foobar'); });
  });
  
  // ------------------------------------------------------------------------------------------------------
  it("should initialize with a mapping file defined!", function(){
    
    console.log('TRANSLATOR: checking initialization wit a mapping file specified');
    
    assert.doesNotThrow(function(){ new Translator('openurl'); });
  });
  
// ------------------------------------------------------------------------------------------------------
// translateKey() Tests
// ------------------------------------------------------------------------------------------------------
  it("translations should return the same value when no mapping file is supplied!", function(){
    
    console.log('TRANSLATOR: checking translations return same value when no mapping file specified');
    
    var translator = new Translator('');
    
    // Make sure that the translator returns the same value if there was no match
    assert.equal('foo', translator.translateKey('foo', true));
    assert.equal('foo', translator.translateKey('foo', false));
    assert.equal(translator.translateKey('rft.genre', true), 'rft.genre');
    assert.equal(translator.translateKey('rft.genre', false), 'rft.genre');
    
    assert.notEqual(translator.translateKey('foo', true), 'bar');
    assert.notEqual(translator.translateKey('foo', false), 'bar');
    assert.notEqual(translator.translateKey('genre', true), 'rft.genre');
    assert.notEqual(translator.translateKey('genre', false), 'rft.genre');
  });
  
  // ------------------------------------------------------------------------------------------------------
  it("openURL translations should return correct value specified in yaml config!", function(){
    var translator = new Translator('openurl');
    
    console.log('TRANSLATOR: checking correct translations of individual keys for openurl');
    
    _.forEach(CONFIGS['openurl'], function(externalName, internalName){
    
      if(externalName instanceof Array){
        // Make sure the translator matches each external name to the same internal name
        _.forEach(externalName, function(name){
          assert.equal(translator.translateKey(name, false), internalName);
        });
      
      }else{
        // Make sure the translator matches the external name to the internal name
        assert.equal(translator.translateKey(externalName, false), internalName);
      }
    
      // Make sure the translator sends back the first external value when passed the internal name
      assert(_.contains(externalName, translator.translateKey(internalName, true)));
    });
    
    // Make sure that the translator returns the same value if there was no match
    assert.equal(translator.translateKey('foo', true), 'foo');
    assert.equal(translator.translateKey('foo', false), 'foo');
  });
  

// ------------------------------------------------------------------------------------------------------
// translateMap() Tests
// ------------------------------------------------------------------------------------------------------
  it("translating an entire map when no mapping file was supplied should return the original map!", function(){
    var translator = new Translator('');
    var mapIn = {'foo': 'bar', 'abc': '123'};
    
    console.log('TRANSLATOR: checking translation of entire maps when no mapping file was specified');
    
    // ------------------------------------------------------------------
    // Internal to External
    
    var mapOut = translator.translateMap(mapIn, true);
    
    _.forEach(mapOut, function(value, key){
      assert.equal(mapIn[key],value); 
    });
    
    // ------------------------------------------------------------------
    // External to Internal
    
    mapOut = translator.translateMap(mapIn, false);
    
    _.forEach(mapOut, function(value, key){
      assert.equal(mapIn[key],value); 
    });
    
  });
    
// ------------------------------------------------------------------------------------------------------
  it("translating an entire map for openURL should return a translated map!", function(){
    var translator = new Translator('openurl');
    
    var mapIn = {};
    
    console.log('TRANSLATOR: checking translation of entire maps when an openurl mapping file was specified');
    
    // ------------------------------------------------------------------
    // External to Internal
    
    _.forEach(CONFIGS['openurl'], function(external, internal){
      // Set the external key = to the internal key names
      if(external instanceof Array){
        _.forEach(external, function(val){
          mapIn[val] = internal;
        });
        
      }else{
        mapIn[external] = internal;
      }
    });
      
    var mapOut = translator.translateMap(mapIn, false);
      
    _.forEach(mapOut, function(value, key){
      // Make sure the translated keys match the internal names
      assert.equal(value, key);
    });
    
    // ------------------------------------------------------------------
    // Internal to External
    
    mapIn = {};
    _.forEach(CONFIGS['openurl'], function(external, internal){
      // Set the internal key = to the first external key name
      if(_.size(external) > 0){
        mapIn[internal] = _.first(external);
      }else{
        mapIn[internal] = external;
      }
      
    });
    
    var mapOut = translator.translateMap(mapIn, true);
      
    _.forEach(mapOut, function(value, key){
      // Make sure the translated keys match the internal names
      assert.equal(value, key);
    });
    
  });
  
});
