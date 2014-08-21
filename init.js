// Load up all of our modules once

// These modules are used throughout (Broker, Tier, Service, etc.)
module.exports = fs = require('fs');
module.exports = yaml = require('js-yaml');
module.exports = _ = require('underscore');
module.exports = util = require('util');  
module.exports = events = require('events');

module.exports = CONFIGS = require("./lib/config.js");

// Used by Tier
module.exports = Encoder = require('node-html-encoder').Encoder;

// Used by Service
module.exports = url = require('url');
module.exports = uuid = require('node-uuid');

// Used in helper
module.exports = querystring = require('querystring');

var i = 0;

// Setup a timer to wait for the CONFIGS to get loaded before continuing
var waitForConfigs = setInterval(function(){
  if(typeof CONFIGS['application'] != 'undefined' || i == 2000){
    clearInterval(waitForConfigs);
 
    module.exports = helper = require("./lib/utils/helper.js");
    module.exports = serializer = require("./lib/utils/serializer.js");
    module.exports = Translator = require("./lib/utils/translator.js");
    module.exports = Consortial = require("./lib/utils/consortial.js");
    
    module.exports = Request = require("./lib/models/request.js");
		module.exports = Requestor = require("./lib/models/requestor.js");
    module.exports = Item = require("./lib/models/item.js");

    //module.exports = LOGGER = require('./lib/logger.js');
    module.exports = Broker = require("./lib/broker.js");
    module.exports = Tier = require("./lib/tier.js");
    module.exports = Service = require("./lib/service.js");
		
		module.exports = OpenUrlParser = require("./lib/parsers/openurl.js");

		// Setup logger
		module.exports = log = require('./lib/logger.js');

		//Load registered notifiers
		module.exports = notifiers = registerNotifiers();

    // Should be for TEST only!
    module.exports = assert = require("assert");
  }
  i++;
}, 200);

// -----------------------------------------------------------------------------------------
function registerNotifiers(){
	var notifiers = {};
	
	_.forEach(CONFIGS['application']['notifiers'], function(name){
		fs.exists(process.cwd() + '/lib/notifiers/' + name + '.js', function(exists){
			if(exists){
				
				fs.exists(process.cwd() + '/config/notifiers/' + name + '.yaml', function(exists){
					if(exists){
						var yml = require('js-yaml');
						
						var config = yml.load(fs.readFileSync(process.cwd() + '/config/notifiers/' + name + '.yaml', 'utf8'));
						var Notifier = require('./lib/notifiers/' + name + '.js');
						
						notifiers[name] = new Notifier(config);
						
					}else{
						log.warn('The notifier, ' + name + ', was registered in application.yaml, but its YAML file does not exist in ./config/notifiers!');
					}
				
				});
				
			}else{
				log.warn('The notifier, ' + name + ', was registered in application.yaml, but the JS file does not exist in ./notifiers!');
			}
		});
	});
	
	return notifiers;
}