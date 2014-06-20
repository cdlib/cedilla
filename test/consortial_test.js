require('../init.js');
		
describe("consortial.js", function(){
	//this.timeout(120000);
	
  var consortial = undefined;
	
  // ---------------------------------------------------------------------------------------------------
  before(function(done){
    // Wait for the config file and init.js have finished loading before starting up the server
    var delayStartup = setInterval(function(){
      if(typeof Consortial != 'undefined'){
        clearInterval(delayStartup);

    		consortial = new Consortial();
				done();
			}
		});
  });
  
  
  // ---------------------------------------------------------------------------------------------------
  it('testing affiliation code to ip', function(done){
		
		consortial.translateCode('UCD', function(val){
			console.log(val);
			
			done();
		});
		
	});
	
  // ---------------------------------------------------------------------------------------------------
  it('testing ip to affiliation code', function(done){
		consortial.translateIp('127.0.0.1', function(val){
			console.log(val);
			
			done();
		});
	});
	
});