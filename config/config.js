var fs = require('fs'),
		yaml = require('js-yaml'),
		_ = require('underscore');
		
if(typeof _configs == 'undefined'){		
	var _configs = [];
}

module.exports.getConfig = function(name, callback){
	// If we're not initialized go ahead and load the files
	if(_.size(_configs) <= 0){
		initialize(function(){
			console.log(_.size(_configs) + ' configs loaded');
			
			callback(findConfig(name));
		});
		
	}else{
		callback(findConfig(name));
	}
};

function initialize(callback){
	fs.readdir(__dirname, function(err, files){
		console.log('searching ' + __dirname + ' for configuration files.');
		registerFiles(__dirname, files);

		fs.readdir(__dirname + '/translation', function(err, files){
			console.log('searching ' + __dirname + '/translation for mapping files.');
			registerFiles(__dirname + '/translation', files);
			
			callback();
		});
		
	});
}

function registerFiles(dir, files){
	var i = _.size(_configs);
	files.forEach(function(file){
		// If the file is a YAML file load it
		if(file.indexOf('.yaml') > 0 || file.indexOf('.yml') > 0){
			var fileName = file.replace('.yaml', '').replace('.yml', '').toLowerCase().trim();

			_configs[i] = new Array(fileName, yaml.load(fs.readFileSync(dir + '/' + file, 'utf8')));

			console.log('loading configuration file --> ' + file)

			// Tell node to watch this file for changes
			fs.watchFile(__dirname + '/' + file, function (curr, prev) {
				// If the file was updated reload it
				if(curr.mtime > prev.mtime){
					console.log('change detected, reloading configuration file --> ' + file);
					_configs[i] = new Array(fileName, yaml.load(fs.readFileSync(dir + '/' + file, 'utf8')));
				}
			});

			i++;
		}
	});
}


function findConfig(name){
	var ret = [];
	
  // Find the specified configuration otherwise return an empty array
	_configs.forEach( function(config){
		if(name.toString().toLowerCase().trim() == config[0].toString()){
			ret = config[1];
		}
	});

	return ret;
}