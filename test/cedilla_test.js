require('../init.js');
    
describe('cedilla.js testing', function(){
  
  var items = [],
      translators = [];
  
  before(function(done){
    _.forEach(CONFIGS['data']['objects'], function(config, type){
      items.push(Item.new(type, false, {}));
    });
    
    
  });
  
});