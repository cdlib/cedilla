require("../../init.js");

var specializeItem = function(queryString) {
  var qs = helper.queryStringToMap(queryString);
  var translator = new Translator('openurl');
  var map = translator.translateMap(qs, false);
  
  //console.log(JSON.stringify(map));
  var item = helper.flattenedMapToItem('citation', true, map);
  
  // Determine which items in the translated query string were not mapped to the item
  var unmapped = "";
  _.forEach(map, function(val, key){
    if(!wasMapped(item, key)){
      if(val instanceof Array){
        unmapped += (unmapped.length == 0 ? '' : '&') + key + '=[' + val + ']';
      }else{
        unmapped += (unmapped.length == 0 ? '' : '&') + key + '=' + val;
      }
    }
  });
  
  // Build the request object and attach the item to it
  var request = new Request({"unmapped": unmapped})
  request.setRequest(queryString);
  request.addReferent(item);
  
  var spcl = specializers.newSpecializer('openurl', item, request);
  var type = spcl.specialize();
  return [type, item];
};

// -------------------------------------------------------------------------------------------
var wasMapped = function(item, key){
  if(typeof item.getAttribute(key) == 'undefined'){
    unmapped = false;
    
    // Make sure its not mapped to one of the child items
    _.forEach(CONFIGS['data']['objects'][item.getType()]['children'], function(child){
      _.forEach(item.getAttribute(child + 's'), function(kid){
        unmapped = wasMapped(kid, key);
      });
    });
    
    return unmapped;
    
  }else{
    return true;
  }
};

// -------------------------------------------------------------------------------------------
describe('Specializer', function(){
  describe('#specialize()', function(){
    
    before(function(done){
      // Wait for the config file and init.js have finished loading before starting up the server
      var delayStartup = setInterval(function(){
        if(typeof Item != 'undefined'){
          clearInterval(delayStartup);
          
          done();
        }
      });
    });
    
    // -------------------------------------------------------------------------------------------
    it('should correctly identify the openurl version', function(){
      console.log("SPECIALIZER: Checking that specializer correctly identifies openurl 1.0");
      var query = "url_ver=Z39.88-2004&url_ctx_fmt=info:ofi/fmt:kev:mtx:ctx&rft_val_fmt=info:ofi/fmt:kev:mtx:journal&rft.atitle=The impact of forest use and reforestation on soil hydraulic conductivity in the Western Ghats of India: Implications for surface and sub-surface hydrology&rft.aufirst=M.&rft.aulast=Bonell&rft.date=2010&rft.epage=64&rft.genre=article&rft.issn=0022-1694&rft.issue=1-2&rft.jtitle=JOURNAL OF HYDROLOGY&rft.pages=49-64&rft.spage=49&rft.stitle=J HYDROL&rft.volume=391&rfr_id=info:sid/www.isinet.com:WoK:UA&rft.au=Purandara, B. K.&rft.au=Venkatesh, B.&rft.au=Krishnaswamy, Jagdish&rft.au=Acharya, H. A. K.&rft_id=info:doi/10.1016/j.jhydrol.2010.07.004";
      var results = specializeItem(query);
      
      assert.equal('openurl-1.0', results[0]);
      assert(results[1] instanceof Item);
    });

    // -------------------------------------------------------------------------------------------
   it('should identify the openurl version without url_ver field', function(){
      console.log("SPECIALIZER: Checking the specializer correctly identifies openurl 1.0 when url_ver field is missing.");
      var query = "url_ctx_fmt=info:ofi/fmt:kev:mtx:ctx&rft_val_fmt=info:ofi/fmt:kev:mtx:journal&rft.atitle=The impact of forest use and reforestation on soil hydraulic conductivity in the Western Ghats of India: Implications for surface and sub-surface hydrology&rft.aufirst=M.&rft.aulast=Bonell&rft.date=2010&rft.epage=64&rft.genre=article&rft.issn=0022-1694&rft.issue=1-2&rft.jtitle=JOURNAL OF HYDROLOGY&rft.pages=49-64&rft.spage=49&rft.stitle=J HYDROL&rft.volume=391&rfr_id=info:sid/www.isinet.com:WoK:UA&rft.au=Purandara, B. K.&rft.au=Venkatesh, B.&rft.au=Krishnaswamy, Jagdish&rft.au=Acharya, H. A. K.&rft_id=info:doi/10.1016/j.jhydrol.2010.07.004";

      var results = specializeItem(query);
      
      assert.equal('openurl-1.0', results[0]);
      assert(results[1] instanceof Item);
   });

   // -------------------------------------------------------------------------------------------
   it('should derive the oclc number from the rfe_dat field', function(){
      console.log("SPECIALIZER: Checking the specializer derives oclc number from rfe_dat field");
      var query = "url_ctx_fmt=info:ofi/fmt:kev:mtx:ctx&rfe_dat=<accessionnumber>12345</accessionnumber>&rft_val_fmt=info:ofi/fmt:kev:mtx:journal&rft.atitle=The impact of forest use and reforestation on soil hydraulic conductivity in the Western Ghats of India: Implications for surface and sub-surface hydrology&rft.aufirst=M.&rft.aulast=Bonell&rft.date=2010&rft.epage=64&rft.genre=article&rft.issn=0022-1694&rft.issue=1-2&rft.jtitle=JOURNAL OF HYDROLOGY&rft.pages=49-64&rft.spage=49&rft.stitle=J HYDROL&rft.volume=391&rfr_id=info:sid/www.isinet.com:WoK:UA&rft.au=Purandara, B. K.&rft.au=Venkatesh, B.&rft.au=Krishnaswamy, Jagdish&rft.au=Acharya, H. A. K.&rft_id=info:doi/10.1016/j.jhydrol.2010.07.004";
      var results = specializeItem(query);
      var item = results[1];
      
      assert(item instanceof Item);
      assert.equal(item.getAttribute('oclc'), '12345');
   });

   // -------------------------------------------------------------------------------------------
   it('should derive the oclc number, isbn, and pmid from the rft_id field', function(){
      console.log("SPECIALIZER: Checking that specializer derives oclc number, pmid and isbn from rft_id field");
      var query = "url_ctx_fmt=info:ofi/fmt:kev:mtx:ctx&rft_id=info:oclcnum/12345&rft_id=urn:ISBN:12345&rft_id=info:pmid/56789&rft_val_fmt=info:ofi/fmt:kev:mtx:journal&rft.atitle=The impact of forest use and reforestation on soil hydraulic conductivity in the Western Ghats of India: Implications for surface and sub-surface hydrology&rft.aufirst=M.&rft.aulast=Bonell&rft.date=2010&rft.epage=64&rft.genre=article&rft.issn=0022-1694&rft.issue=1-2&rft.jtitle=JOURNAL OF HYDROLOGY&rft.pages=49-64&rft.spage=49&rft.stitle=J HYDROL&rft.volume=391&rfr_id=info:sid/www.isinet.com:WoK:UA&rft.au=Purandara, B. K.&rft.au=Venkatesh, B.&rft.au=Krishnaswamy, Jagdish&rft.au=Acharya, H. A. K.&rft_id=info:doi/10.1016/j.jhydrol.2010.07.004";
      var results = specializeItem(query);
      var item = results[1];
      
      assert(item instanceof Item);
      assert.equal(item.getAttribute('oclc'), '12345');
      assert.equal(item.getAttribute('isbn'), '12345');
      assert.equal(item.getAttribute('pmid'), '56789');
   });

   // -------------------------------------------------------------------------------------------
   it('should identify openurl 0.1', function(){
      console.log("SPECIALIZER: Checking that specializer identifies openurl 0.1 version");
      var query = "sid=UCLinks-google&volume=8&aulast=Ellison&month=09&atitle=Mangrove Restoration: Do We Know Enough?&spage=219&issn=1061-2971&issue=3&genre=article&auinit=A M&aufirst=Aaron&epage=229&title=Restoration ecology&year=2000&date=2000-09&pid=institute=UCB&placeOfPublication=Cambridge%2c+Mass.&publisher=Blackwell+Scientific+Publications";
      var results = specializeItem(query);
      var item = results[1];
      
      assert.equal('openurl-0.1', results[0]);
      assert(results[1] instanceof Item);
   });

   // -------------------------------------------------------------------------------------------
   it('should derive the pid values from an openurl 0.1', function() {
     console.log("SPECIALIZER: Checking that the pid values are derived from an openurl 0.1 id field");
     var query = "id=pmid:19889244&id=lccn:56789&sid=UCLinks-Entrez:PubMed&aulast=Spadafranca&month=11&atitle=Effect of dark chocolate on plasma epicatechin levels, DNA resistance to oxidative stress and total antioxidant activity in healthy subjects.&spage=1&issn=0007-1145&genre=article&auinit=A&epage=7&title=The British Journal of Nutrition&year=2009&pid=institute%3DUCOP%26placeOfPublication%3DWallingford%252C%2BOxfordshire%26publisher%3DCABI%2BPub";
     var results = specializeItem(query);
     var item = results[1];
    
     assert(item instanceof Item);
     assert.equal(item.getAttribute('pmid'), '19889244'); 
     assert.equal(item.getAttribute('lccn'), '56789');
     assert.equal(item.getAttribute('institute', 'UCOP'));
     assert.equal(item.getAttribute('publication_place'), 'Wallingford, Oxfordshire');
     assert.equal(item.getAttribute('publisher'), 'CABI Pub');
   });

  });

});
