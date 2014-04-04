var fs = require('fs'),
		yaml = require('js-yaml');
/* -------------------------------------------------------------------------------------------
 * Load up the configuration files
 * 
 * This includes a listener that will reload the config files as they change, so no need to
 * restart this application due to a config change
 * ------------------------------------------------------------------------------------------- */

 var ConfigurationManager = function(){
	 this._configs = [];

	 intialize(this._configs);

		this.getConfig = function(val){
			var ret = [];
	
			// Find the specified configuration otherwise return an empty array
			this._configs.forEach( function(config){
				if(val.toString().toLowerCase().trim() == config[0].toString()){
					ret = config[1];
				}
			});
	
			return ret;
		};
		
		function intialize(array){
			fs.readdir(__dirname, function(err, files){

				console.log('searching ' + __dirname + ' for configuration files.');

				var i = 0;
				files.forEach(function(file){
					// If the file is a YAML file load it
					if(file.indexOf('.yaml') > 0 || file.indexOf('.yml') > 0){
						var fileName = file.replace('.yaml', '').replace('.yml', '').toLowerCase().trim();

						array[i] = new Array(fileName, yaml.load(fs.readFileSync(__dirname + '/' + file, 'utf8')));

						console.log('loading configuration file --> ' + file)

						// Tell node to watch this file for changes
						fs.watchFile(__dirname + '/' + file, function (curr, prev) {
							// If the file was updated reload it
							if(curr.mtime > prev.mtime){
								console.log('change detected, reloading configuration file --> ' + file);
								array[i] = new Array(fileName, yaml.load(fs.readFileSync(__dirname + '/' + file, 'utf8')));
							}
						});
	
						i++;
					}
				});

			});
		};
		
}

module.exports = ConfigurationManager;
