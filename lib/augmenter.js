var CONFIGS = require('./config.js');

var _ = require('underscore'),
    Item = require('./item.js');
    
module.exports = {
  
  augmentItem: function(originalItem, newItem){
    var children = CONFIGS['data']['objects'][newItem.getType()]['children'] || [];
		
    _.forEach(newItem.getAttributes(), function(value, key){
 
 		 	if(_.contains(children, key.slice(0, -1))){
 		 		var current = originalItem.getAttribute(key) || [];

			  console.log(key);
 				
				console.log(current);
				
				originalItem.addAttribute(key, current);
				
 		 	}else{
	      if(originalItem.hasAttribute(key)){
	        newItem.removeAttribute(key);
	        // TODO: if the key already exists in the original and the values are different
	        //       we may have an ambiguity issue!
	      }else{
	        // The item didn't have this value so add the value to the original
	        originalItem.addAttribute(key, value);
	      }
			}
			
    });
    
  }
  
}