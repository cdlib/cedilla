var helper = require('./helper.js'),
		http = require('http'),
		url = require('url'),
		Translator = require('./translator.js');

/* -----------------------------------------------------------------------------------------------
 * Service
 * ----------------------------------------------------------------------------------------------- 
 */
function Service(name, config) {
	// Do the initialization  
	this._name = helper.safeAssign('string', name, 'unknown');
	this._displayName = helper.safeAssign('string', config['display_name'], this._name);
	
	this._enabled = helper.safeAssign('boolean', config['enabled'], false);
	this._maxAttempts = helper.safeAssign('number', config['max_attempts'], 1);
	this._timeout = helper.safeAssign('number', config['timeout'], 5);
	
	this._target = helper.safeAssign('string', config['target'], undefined);
	
	this._translator = helper.safeAssign('string', config['translator'], undefined);

	// -----------------------------------------------------------------------------------------------
	this.getName = function(){ return this._name; }
	// -----------------------------------------------------------------------------------------------
	this.getDisplayName = function(){ return this._displayName; }
	// -----------------------------------------------------------------------------------------------
	this.isEnabled = function(){ return this._enabled; }
	
	this.toString = function() { return this._name; }
	
	// -----------------------------------------------------------------------------------------------
	this.call = function(item, callback){
		var out = "",
				now = new Date(),
				self = this;
		
		var translator = new Translator(this._translator);
		
		// Build the JSON post data for the citation
		var data = '{"time":"' + now.toJSON() + '","service":"' + this._name + '","' + item.getType() + '":';
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
				response.setEncoding('utf8');
				response.on('data', function(chunk){
					out += chunk;
				});
				response.on('end', function(){
					var rslt = undefined,
							json = JSON.parse(out);
					
					// TODO: Do we need to consider passing a unique key back and forth to confirm the correct response?
					
					// If the result is for the current request then convert the json to objects
					if(json['service'] != self._name){
						if(typeof json[item.getType()] != 'undefined'){
							rslt = translator.mapToItem(item.getType(), false, json[item.getType()], false);
						
						}else{
							console.log('.... was expecting ' + self._name + ' to return a ' + item.getType());
							console.log(json);
						}
						
					}else{
						console.log('...... response received was NOT from ' + self._name + '!');
					}
					
					console.log('...... response received, hanging up from ' + self._name);
					callback(rslt);
				});
			});
			
			request.setTimeout(this._timeout, function(){
				console.log('...... timeout while trying to connect to ' + self._name);
			});
			
			request.on('error', function(e){
				if(e.message.indexOf('ECONNREFUSED') >= 0){
					console.log('...... ' + self._name + ' does not appear to be responding.');
				}else{
					console.log('...... error occurred while connecting to ' + self._name + ': ' + e.message);
				}
			});
			
			console.log('...... sending: ' + data);
			
			request.write(data);
			request.end();
		
		}else{
			throw new Error("Cannot contact " + this._name + " because no HTTP target is defined in ./config/services.yaml!");
		}
		
	};
	
};

module.exports = Service;