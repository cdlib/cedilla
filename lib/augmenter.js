var CONFIGS = require('./config.js');

var _ = require('underscore'),
		Item = require('./item.js');
		
module.exports = {
	
	augmentItem: function(originalItem, newItem){
		
		_.forEach(newItem.getAttributes(), function(value, key){
		
			if(originalItem.hasAttribute(key)){
				// TODO: if the key already exists in the original and the values are different
				//       we may have an ambiguity issue!
			}else{
				// The item didn't have this value so add the value to the original
				originalItem.addAttribute(key, value);
			}
		
		});
		
	}
	
}