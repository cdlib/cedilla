require('../init.js');
    
describe('cedilla.js testing', function(){
  
  var items = [],
      translators = [];
  
  before(function(done){
    // Wait for the config file and init.js have finished loading before starting up the server
    var delayStartup = setInterval(function(){
      if(typeof Item != 'undefined'){
        clearInterval(delayStartup);
        
        _.forEach(CONFIGS['data']['objects'], function(config, type){
          items.push(Item.new(type, false, {}));
        });
    
        done();
      }
    });
  });
  
});