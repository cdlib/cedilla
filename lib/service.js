var helper = require('./helper.js'),
		http = require('http');

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

	// -----------------------------------------------------------------------------------------------
	this.getName = function(){ return this._name; }
	// -----------------------------------------------------------------------------------------------
	this.getDisplayName = function(){ return this._displayName; }
	// -----------------------------------------------------------------------------------------------
	this.isEnabled = function(){ return this._enabled; }
	
	this.toString = function() { return this._name; }
	
	// -----------------------------------------------------------------------------------------------
	this.call = function(item, callback){
		var out = "";
		
		var data = item.toJSON(this._name);
		
		console.log('...... Connecting to ' + this._target);
		
		// TODO: Remove this if when testing is over, we will only ever POST
		if(this._target.indexOf('worker') > 0){
			http.get('http://localhost:3000/worker1?name=' + this._name, function(response){
		
				response.setEncoding('utf8');
				response.on('data', function(chunk){
					//console.log('...... reading <-- ' + chunk);
					out += chunk;
				});
				response.on('end', function(){
					console.log('...... hanging up from ' + this._name);
					callback(out);
				});
			
			});
			
		}else{
			var options = {
				hostname: '0.0.0.0',
				port: 3101,
				path: '/service_test',
				method: 'POST',
				headers: {'Content-Type': 'text/json', 'Content-Length': data.length}
			};
			
			var request = http.request(options, function(response){
				response.setEncoding('utf8');
				response.on('data', function(chunk){
					out += chunk;
				});
				response.on('end', function(){
					console.log('...... hanging up from ' + this._name);
					callback(out);
				});
			});
			
			request.on('error', function(e){
				console.log('...... ' + e.message);
			});
			
			console.log('...... sending: ' + data);
			
			request.write(data);
			request.end();
		}
		
	};
	
};

module.exports = Service;