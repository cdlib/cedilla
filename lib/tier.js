var Service = require('./service.js'),
		helper = require('./helper.js'),
		_ = require('underscore');

/* -----------------------------------------------------------------------------------------------
 * TIER
 * ----------------------------------------------------------------------------------------------- 
 */
var Tier = function(name, configManager, servicesIn) {
	this._name = helper.safeAssign('string', name, 'tier_?');
	this._configManager = configManager;
	
	var _complete = 0;
	var _holding = 0;
	var _total = -1;
	
	var _holdingQueue = [];

	var svcConfig = configManager.getConfig('services');
	var rulesConfig = configManager.getConfig('rules');

	// Load the services
	this._services = _.map(servicesIn, function(svcConfig){
		return new Service(svcConfig[0], svcConfig[1]);
	});
	
	_total = _.size(this._services);

	// TODO: Setup a heartbeat monitor since services may have been on hold 
	
	// -----------------------------------------------------------------------------------------------
	this.getName = function(){ return this._name; }
	// -----------------------------------------------------------------------------------------------
	this.getServiceCount = function(){ return _.size(this._services); };

	// -----------------------------------------------------------------------------------------------
	this.addServices = function(services){ _.forEach(services, function(service){ this._services.push(service); }); };

	// -----------------------------------------------------------------------------------------------
	this.negotiate = function(socket, citation, callback){

		// Process the services in parallel
		_.each(this._services, function(service){
			
			// Check to see if the citation has enoough info for the service to dispatch
			if(hasMinimumCitation(citation, service)){
				dispatchService(socket, citation, service, callback);
			
			}else{
				//Otherwise place the service in the holding queue
				_holdingQueue.push(service);
			}
		});
		
	};

	// -----------------------------------------------------------------------------------------------
	function callService(service, citation, callback){
		setTimeout(function(){ 
			console.log('.... calling ' + service.getName());
			service.call(citation, callback);
		});
	};
	
	// -----------------------------------------------------------------------------------------------
	function dispatchingComplete(callback){ 
		console.log('.... all calls complete'); 
		// Pass any remaining services from the holding queue so that they are available as the next tier processes
		callback(_holdingQueue); 
	};
	
	// -----------------------------------------------------------------------------------------------
	function dispatchService(socket, citation, service, callback){
		
		// TODO: Only call the service if it able to!!!
		try{
			callService(service, citation, function(result){
				// TODO: augment the citation if possible
		
				// TODO: parse the results and emit for each item
				socket.emit('resource', result);
				_complete++;
			
				if(((_complete >= _total && _total > 0) || _total == 0)){
					dispatchingComplete(callback);
				}
			});
	
		}catch(e){
			console.log('.... ' + e);
			socket.emit('error', e);
			callback();
		}
	};
	
	// -----------------------------------------------------------------------------------------------
	function hasMinimumCitation(citation, service){
		return true;
	
	}
};


module.exports = Tier;