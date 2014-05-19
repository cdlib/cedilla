/* -----------------------------------------------------------------------------------------------
 * AUGMENTER: The augmenter is responsible for comparing the original Item.js object sent in through
 *            the client's request to the ones received back from the services. It is responsible
 *            for adding new information to the original item and removing all repeated information
 *            from the new items so that duplicate information does not get sent back to the client.
 *            The augmented original item is then examined to see if any of the new information could
 *            allow services that had been placed on hold to begin processing.
 * ----------------------------------------------------------------------------------------------- 
 */
		
module.exports = {
  
  augmentItem: function(originalItem, newItem){
    var children = CONFIGS['data']['objects'][newItem.getType()]['children'] || [];
		
    _.forEach(newItem.getAttributes(), function(value, key){
 
 		 	if(_.contains(children, key.slice(0, -1))){
 		 		var current = originalItem.getAttribute(key) || [];
				
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