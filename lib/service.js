var CONFIGS = require('./config.js');

var helper = require('./helper.js'),
		http = require('http'),
		url = require('url'),
		uuid = require('node-uuid'),
		_ = require('underscore'),
		Translator = require('./translator.js');

/* -----------------------------------------------------------------------------------------------
 * Service
 * ----------------------------------------------------------------------------------------------- 
 */
function Service(name) {
	// Do the initialization  
	this._name = helper.safeAssign('string', name, 'unknown');
	
	var config = this._getConfig();
	
	this._displayName = helper.safeAssign('string', config['display_name'], this._name);
	
	this._enabled = helper.safeAssign('boolean', config['enabled'], false);
	this._maxAttempts = helper.safeAssign('number', config['max_attempts'], 1);
	this._timeout = helper.safeAssign('number', config['timeout'], 5);
	
	this._target = helper.safeAssign('string', config['target'], undefined);
	
	this._translator = helper.safeAssign('string', config['translator'], undefined);
};

// -----------------------------------------------------------------------------------------------
Service.prototype.getName = function(){ return this._name; }
// -----------------------------------------------------------------------------------------------
Service.prototype.getDisplayName = function(){ return this._displayName; }
// -----------------------------------------------------------------------------------------------
Service.prototype.isEnabled = function(){ return this._enabled; }
// -----------------------------------------------------------------------------------------------
Service.prototype.toString = function() { return this._name; }
	
// -----------------------------------------------------------------------------------------------
Service.prototype.call = function(item, callback){
	var out = "",
			now = new Date(),
			self = this,
			requestId = uuid.v4();
	
	var translator = new Translator(self._translator);
	
	// Build the JSON post data for the citation
	var data = '{"time":"' + now.toJSON() + '","api_ver":"' + CONFIGS['application']['api_version'] + '","id":"' + requestId+ '","' + item.getType() + '":';
	data += translator.mapToJSON(translator.itemToMap(item));
	data += '}';
	
	console.log('...... Connecting to ' + this._target);
	
	if(typeof this._target != 'undefined'){
		var destination = url.parse(this._target);
		
		var options = {hostname: destination.hostname,
									 port: destination.port,
								   path: destination.path,
								 	 method: 'POST',
								   headers: {'Content-Type': 'text/json', 
									 					 'Content-Length': data.length,
													   'Accept': 'text/json',
													   'Accept-Charset': 'utf-8',
													   'Cache-Control': 'no-cache'}};/*,
													   'Origin': headers['origin'],
													   'Referer': headers['referer'],
													   'User-Agent': headers['user-agent']}};*/
									 
		var request = http.request(options, function(response){
			
			// ---------------------------------------------------
			response.setEncoding('utf8');
			
			// ---------------------------------------------------
			response.on('data', function(chunk){
				out += chunk;
			});
			
			// ---------------------------------------------------
			response.on('end', function(){
				var rslt = undefined;
				
				try{
					switch(response.statusCode){
					
						case 200: // SUCCESS
							var json = JSON.parse(out);
				
							// If the result is for the current request then convert the json to objects
							if(json['id'] != self._id){
								if(typeof json[item.getType() + 's'] != 'undefined'){
							
									//TODO: Need to deal with multiple base level items!
									rslt = translator.mapToItem(item.getType(), false, json[item.getType() + 's'][0], false);
					
								}else{
									console.log('.... was expecting ' + self._name + ' to return a ' + item.getType());
									console.log('.... ' + json);
								}
					
							}else{
								console.log('...... response received was NOT from ' + self._name + '!');
							}
							break;
						
						case 400: // BAD REQUEST
							console.log('...... the JSON sent to ' + self._name + ' appears to have been invalid!');
							console.log('.... ' + data);
							rslt = new Error("The JSON sent to " + self._name + " appears to have been invalid!");
							break;
						
						case 404: // NOT FOUND
							console.log('...... the ' + self._name + ' service found no results!');
							console.log('.... ' + out);
							rslt = translator.mapToItem(item.getType(), false, {}, false);
							break;
						
						default: // ERROR!!!
							var json = JSON.parse(out);
								
							if(json['level'] == 'fatal'){
								// TODO: Update the service.yaml to bring this service offline and email the service admin and aggregator team
								
								rslt = new Error(self._name + " was unable to process the request!");
								
							}else if(json['level'] == 'error'){
								// Its an error, pass it on to the client for them to interpret
								rslt = new Error(self._name + " was unable to process the request: " + json['error'] );
								
							}else{
								// Send back an empty citation
								rslt = translator.mapToItem(item.getType(), false, {}, false);
							}
							
							console.log('...... ' + json['level'] + ' received from ' + self._name + ': ' + json['error']);
							console.log('.... ' + out);	
							break;
					}
				
				}catch(e){
					console.log('...... fatal error in service.call() processing response from ' + self._name);
					console.log(out);
					rslt = new Error(self._name + " was unable to process the request due to a server error!");
				}
				
				callback(rslt);
				
			});
		});
		
		// ---------------------------------------------------
		request.setTimeout(this._timeout, function(){
			console.log('...... timeout while trying to connect to ' + self._name);
		});
		
		// ---------------------------------------------------
		request.on('error', function(e){
			
			
			if(e.message.indexOf('ECONNREFUSED') >= 0){
				console.log('...... ' + self._name + ' does not appear to be responding.');
			}else{
				console.log('...... error occurred while connecting to ' + self._name + ': ' + e.message);
			}
			
			callback(e);
		});
		
		console.log('...... sending: ' + data);
		
		request.write(data);
		request.end();
	
	}else{
		throw new Error("Cannot contact " + this._name + " because no HTTP target is defined in ./config/services.yaml!");
	}
	
};

// -----------------------------------------------------------------------------------------------
Service.prototype._getConfig = function(){
	var self = this;
	var ret = {};
	
	_.forEach(CONFIGS['services']['tiers'], function(services, tier){
		_.forEach(services, function(config, name){
			if(name == self._name){ ret = config; }
		});
	});
	
	return ret;
};

// -----------------------------------------------------------------------------------------------
module.exports = Service;