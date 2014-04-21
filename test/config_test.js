var assert = require("assert"),
		fs = require('fs'),
		_ = require('underscore');
	
describe('config.js testing', function(){
	this.timeout(10000);

	var configManager = undefined,
			testConfig = undefined,
			data = undefined;
	
	// ---------------------------------------------------------------------------------------------------
	before(function(done){
		configManager = require("../config/config.js")
		
		// Build out our own test.yml file
		fs.writeFile(__dirname.replace('/test', '/config') + '/test.yml', "test:\n  - one\n  - two\n", function(err){
			if(err){
				console.log(err);
			}else{
				console.log('created /config/test.yml');
			}
		
			// Call the configManager for the first time so that the yaml files get loaded
			configManager.getConfig('data', function(config){	
				data = config;	
				done();
			});
			
		});
		
	});

	// ---------------------------------------------------------------------------------------------------
	after(function(done){
		fs.unlink(__dirname.replace('/test', '/config') + '/test.yml', function(err){
			if(err){
				console.log(err);
			}else{
				console.log('deleted /config/test.yml');
			}
			done();
		});
	});

	// ---------------------------------------------------------------------------------------------------
	// Gets all of the configs
	it('should have loaded ALL of the YAML files!', function(){
		var cfgMgr = configManager;  // Need to do this so its scoped locally and visible in forEach below
		
		// Switch to the config directory and loop through the files
		//process.chdir('config');
		fs.readdir(__dirname.replace('/test', '/config'), function(err, files){
			files.forEach(function(file){
				
				// If its a YAML file try to load it
				if(file.indexOf('.yaml') > 0 || file.indexOf('.yml') > 0){
					var fileName = file.replace('.yaml', '').replace('.yml', '').toLowerCase().trim();
					
					// Make sure each YAML is found
					assert(cfgMgr.getConfig(fileName, function(config){ return typeof config; }) != 'undefined');
				}
			});
		});
	});

});
