var helper = require('./helper.js'),
		Map = require('collections/map'),
		_ = require('underscore'),
		Author = require('./author.js');

/* -----------------------------------------------------------------------------------------------
 * CITATION
 * ----------------------------------------------------------------------------------------------- 
 */
var Citation = function(attributes, authors, resources) {
	this._attributes = attributes;
	this._authors = [];
	this._resources = [];
	
	// -----------------------------------------------------------------------------------------------
	this.getGenre = function(){ return this.getValue('genre'); };
	// -----------------------------------------------------------------------------------------------
	this.getContentType = function(){ return this.getValue('content_type'); };
	
	// -----------------------------------------------------------------------------------------------
	this.isValid = function(){ return (this.hasAttribute('genre') && this.hasAttribute('content_type')); };
	
	// -----------------------------------------------------------------------------------------------
	this.addAttribute = function(key, value){ this._attributes.set(key, value); };
	
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
	
	// -----------------------------------------------------------------------------------------------
	this.addAuthor = function(author){ if(author instanceof Author){ this._authors.push(author); } };
};

module.exports = Citation;
