require('../../init.js');
    
describe("consortial.js", function(){
  //this.timeout(120000);
  
  var consortial = undefined,
      oldTranslateCode = undefined,
      oldTranslateIp = undefined;
  
  // ---------------------------------------------------------------------------------------------------
  before(function(done){
    // Wait for the config file and init.js have finished loading before starting up the server
    var delayStartup = setInterval(function(){
      if(typeof Consortial != 'undefined'){
        clearInterval(delayStartup);

        oldTranslateCode = Consortial.prototype.translateCode;
        oldTranslateIp = Consortial.prototype.translateIp;

        Consortial.prototype.translateCode = function(code, callback){ callback('127.0.0.1'); }
        Consortial.prototype.translateIp = function(ip, callback){ callback('CAMPUS-A'); }

        consortial = new Consortial();
        done();
      }
    });
  });
  
	// ---------------------------------------------------------------------------------------------------
  after(function(done){
    Consortial.prototype.translateCode = oldTranslateCode;
    Consortial.prototype.translateIp = oldTranslateIp;
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  it('testing both ip and code target URLs are defined', function(){
    // Skip the test if the consortial_service is turned off in the application.yaml config!
    if(typeof CONFIGS['application']['consortial_service'] != 'undefined'){
      console.log('CONSORTIAL: Checking for existence of both the code and ip target URLs');
      
      assert(typeof CONFIGS['application']['consortial_service']['translate_from_code'] != 'undefined');
      assert(typeof CONFIGS['application']['consortial_service']['translate_from_ip'] != 'undefined');
    }
  });
  
  // ---------------------------------------------------------------------------------------------------
  it('testing affiliation <--> ip translations', function(done){
    var ip = '127.0.0.1';
  
    // Skip the test if the consortial_service is turned off in the application.yaml config!
    if(typeof CONFIGS['application']['consortial_service'] != 'undefined'){
      // Get the code for the specified IP address
      consortial.translateIp(ip, function(val){
        var code = val;

        assert(code == 'CAMPUS-A');

        // Get the IP for the specified code and make sure they match!
        consortial.translateCode(code, function(val){
        
          console.log('CONSORTIAL: ip: ' + ip + ' translated to code: ' + code + ' to ip: ' + val);
        
          assert(val != undefined);
          assert(val.indexOf('.') > 0);
        
          done();
        });
      
      });
    }else{
      done();
    }
  });
  
});