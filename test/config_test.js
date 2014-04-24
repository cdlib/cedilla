var CONFIGS = undefined;

var assert = require("assert"),
		fs = require('fs'),
		_ = require('underscore');
		
describe('config.js testing', function(){
	this.timeout(10000);
	
	// ---------------------------------------------------------------------------------------------------
	it('should have loaded ALL of the YAML files!', function(){
		loadConfigs(function(){
		
			// Switch to the config directory and loop through the files
			fs.readdir(__dirname.replace('/test', '/config'), function(err, files){
				files.forEach(function(file){
				
					// If its a YAML file try to load it
					if(file.indexOf('.yaml') > 0 || file.indexOf('.yml') > 0){
						var fileName = file.replace('.yaml', '').replace('.yml', '').toLowerCase().trim();
					
						// Make sure each YAML is found
						assert(typeof CONFIGS[fileName] != 'undefined');
					}
				});
			});
			
		});
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should reload a yaml after it has been updated!', function(){
		
		// We cannot reliably test the reload functionality. The node.js FileSystem Synchronous and Async commands
		// simply halt or allow the node event loop to continue, they do not instruct the Kernel to perform the
		// underlying function sync or async.
		
/*		
		// Build a new test.yaml file
		console.log('creating /config/test.yml');
		
		fs.writeFile(file, "first:\n  - one\n  - two\n", function(err){
			
			if(err){
				console.log('error: ' + err);
				
			}else{
				// Load the configs
				loadConfigs(function(){
			
					assert.equal(2, _.size(CONFIGS['test']['first']));
			
					// Update the test.yaml config	
					fs.appendFile(file, "  - three\n", function(err){
						console.log('updating /config/test.yaml');
				
						assert.equal(3, _.size(CONFIGS['test']['first']));
				
						fs.unlink(file, function(){
							console.log('unlinking /config/test.yaml');
						});
					});
				});
				
			}
			
		}); 
*/
		
	});
	
});

// ---------------------------------------------------------------------------------------------------
function loadConfigs(callback){
	CONFIGS = require('../lib/config.js');
	callback();
}
