require('../index.js');
    
describe("augmenter.js", function(){
  
  var getAttributeMap = undefined,
      item = undefined,
      rootItem = '';
  
  // ---------------------------------------------------------------------------------------------------
  before(function(done){
    
    getAttributeMap = function(type, value){
      var map = {},
          self = this;

      if(typeof CONFIGS['data']['objects'][type] != 'undefined'){
        
        _.forEach(CONFIGS['data']['objects'][type]['attributes'], function(attribute){
          map[attribute] = value;
        });
    
        if(typeof CONFIGS['data']['objects'][type]['children'] != 'undefined'){
          _.forEach(CONFIGS['data']['objects'][type]['children'], function(child){
            map[child + 's'] = [getAttributeMap(child)];
          });
        }
      }
  
      return map;
    };
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      if(typeof def['root'] != 'undefined'){
        rootItem = type;
        item = new Item(type, false, getAttributeMap(type, 'foo-bar'));
      }
    });
    
    done();
  });
  
  
  // ---------------------------------------------------------------------------------------------------
  it('testing augmentItem()', function(){
		var original = item;
		var newItem = new Item(rootItem, false, getAttributeMap(rootItem, 'blah-blah'));
		
		augmenter.augmentItem(original, newItem);

		_.forEach(item.getAttributes(), function(value, key){
			// Make sure existing entries were ignored.
			if(value instanceof Array){
				assert.equal(_.size(value), _.size(original.getAttribute(key)));
			}else{
				assert.equal(value, original.getAttribute(key));
				
				// Make sure the augmenter removed the entries from the new item so that they do not get sent to the client
				assert.equal('undefined', (typeof newItem.getAttribute(key)));
			}
			
		});
		
		original = item;
		firstAttribute = CONFIGS['data']['objects'][rootItem]['attributes'][0];
		original.removeAttribute(firstAttribute);
		
		newItem.addAttribute('yadda', 'yadda');
		newItem.addAttribute(firstAttribute, 'testing');
		
		augmenter.augmentItem(original, newItem);
		
		// Make sure that the new attribute was appended to the original and that it was not removed from the new item
		assert.equal('testing', original.getAttribute(firstAttribute));
		assert.equal('testing', newItem.getAttribute(firstAttribute));
		
		assert.equal(1, _.size(original.getAttribute('additional')));
		assert.equal('yadda', original.getAttribute('additional')[0]['yadda']);
		assert.equal(1, _.size(newItem.getAttribute('additional')));
		assert.equal('yadda', newItem.getAttribute('additional')[0]['yadda']);
	});
	
});