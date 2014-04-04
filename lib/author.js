var Author = function(attributes){
	this._attributes = attributes;
		
	// -----------------------------------------------------------------------------------------------
	this.isValid = function(){ return this.hasAttribute('last_name'); };
	
	// -----------------------------------------------------------------------------------------------
	this.getAttributes = function(){ return this._attributes; };
	// -----------------------------------------------------------------------------------------------
	this.setAttributes = function(attributes){ 
		if(attributes instanceof Map){
			this._attributes.set(attributes); 
		}
	}; 
	// -----------------------------------------------------------------------------------------------
	this.getValue = function(key){ return this._attributes.get(key); };
	// -----------------------------------------------------------------------------------------------
	this.hasAttribute = function(key){ return this._attributes.get(key); };

};

module.exports = Author;