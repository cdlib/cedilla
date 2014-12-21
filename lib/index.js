// Load up all of our modules once and re-export

// These modules are used throughout (Broker, Tier, Service, etc.)
exports.fs = fs = require('fs');
exports.yaml = yaml = require('js-yaml');
exports._ = _ = require('underscore');
exports.util = util = require('util');  
exports.events = events = require('events');
exports.CONFIGS = CONFIGS = require("./config.js");

// Used by Tier (not currently)
// module.exports = Encoder = require('node-html-encoder').Encoder;

// Used by Service
exports.url = url = require('url');
exports.uuid = uuid = require('node-uuid');

// Used in helper
exports.querystring = querystring = require('querystring');

var i = 0;

// Setup a timer to wait for the CONFIGS to get loaded before continuing
var waitForConfigs = setInterval(function(){
  if(typeof CONFIGS['application'] != 'undefined' || i == 2000){
    clearInterval(waitForConfigs);
 
    exports.helper = helper = require("./utils/helper.js");
    exports.serializer = serializer = require("./utils/serializer.js");
    exports.Translator = Translator = require("./utils/translator.js");
    exports.Consortial = Consortial = require("./utils/consortial.js");
    exports.Request = Request = require("./models/request.js");
    exports.Requestor = Requestor = require("./models/requestor.js");
    exports.Item = Item = require("./models/item.js");

    //module.exports = LOGGER = require('./logger.js');
    exports.Broker = Broker = require("./broker.js");
    exports.Tier = Tier = require("./tier.js");
    exports.Service = Service = require("./service.js");
    exports.OpenUrlParser = OpenUrlParser = require("./parsers/openurl.js");

    // Setup logger
    exports.log = log = require('./logger.js');

    //Load registered notifiers
    exports.notifiers = notifiers = registerNotifiers();

    // Should be for TEST only!
    exports.assert = assert = require("assert");
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
