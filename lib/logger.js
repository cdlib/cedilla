var fs = require('fs'),
		yaml = require('js-yaml'),
		config = yaml.load(fs.readFileSync(process.cwd() + '/config/application.yaml', 'utf8')),
		path = config['log_path'];

var stdout = undefined,
		stderr = undefined;
				
// -----------------------------------------------------------------------------------------	
var Logger = function(){
	var self = this;
	
	console.log('initializing logger');
	
	self._initialize();
	
	// Setup a watcher for the config to watch for log file changes
	fs.watchFile(process.cwd() + '/config/application.yaml', function(curr, prev){
		if(curr.mtime > prev.mtime){
			console.log('reloading logger configuration');
			self.config = yaml.load(fs.readFileSync(process.cwd() + '/config/application.yaml', 'utf8'));
		
			self._initialize();
		}
	});
};

// -----------------------------------------------------------------------------------------
Logger.prototype._initialize = function(){
	var self = this;
	
	// First see if the log directory exists. If not create it
	if(!fs.existsSync(path)){ fs.mkdirSync(path); }

	// If the log directory was created and the error log was defined direct access logs to the file
	if(fs.existsSync(path) && typeof config['access_log_name'] != 'undefined'){
		self.stdout = fs.createWriteStream(path + '/' + config['access_log_name'], {flags: 'a'});
	}else{
		self.stdout = process.stdout;
		console.log('No access_log_name defined in ./config/application.yaml, defaulting to stdout.');
	}

	// If the log directory was created and the error log was defined direct error logs to the file
	if(fs.existsSync(path) && typeof config['error_log_name'] != 'undefined'){
		self.stderr = fs.createWriteStream(path + '/' + config['error_log_name'], {flags: 'a'});
	}else{
		self.stderr = process.stderr;
		console.log('No error_log_name defined in ./config/application.yaml, defaulting to stderr.');
	}
};

// -----------------------------------------------------------------------------------------
Logger.prototype.debugLevel = function(){ return config['log_level'] ? config['log_level'] : 'warn'; };

// -----------------------------------------------------------------------------------------
Logger.prototype.log = function(level, message){
	var levels = {'error': 0, 'warn': 1, 'info': 2, 'debug': 3};
	var now = new Date();
	var self = this;
	
	if(levels[level.toString().toLowerCase()] <= levels[self.debugLevel().toString().toLowerCase()]){
		if(typeof message != 'string'){
			message = JSON.stringify(message);
		};
		
		message = "\n" + level.toString().toUpperCase() + " -- " + now.toString() + " : " + message
		
		if(level.toString().toLowerCase() == 'error'){
			self.stderr.write(message);
		}else{
			self.stdout.write(message);
		}
		
	}
};

// -----------------------------------------------------------------------------------------
// Make this a singleton!
global.CEDILLA_LOGGER = global.CEDILLA_LOGGER ? global.CEDILLA_LOGGER : new Logger();

module.exports = global.CEDILLA_LOGGER;