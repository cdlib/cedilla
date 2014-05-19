var fs = require('fs'),
    yaml = require('js-yaml'),
    config = yaml.load(fs.readFileSync(process.cwd() + '/config/application.yaml', 'utf8')),
    path = config['log_path'];

var logLevel = 'warn',
    stdout = undefined,
    stderr = undefined,
    levels = {};
        
/* -----------------------------------------------------------------------------------------------
 * Logger: The logger creates a wrapper around Node's built in stdout and stderr methods so that
 * the output of those streams is directed to a set of files rather than the console
 * -----------------------------------------------------------------------------------------------
 */

// -----------------------------------------------------------------------------------------  
var Logger = function(){
  var self = this;
  
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
  
  self.levels = {'error': 0, 'warn': 1, 'info': 2, 'debug': 3};
  
  self.logLevel = config['log_level'] ? config['log_level'] : 'warn';
  console.log('setting log level to ' + self.logLevel);
  
  // First see if the log directory exists. If not create it
  if(!fs.existsSync(path)){ fs.mkdirSync(path); }

  // If the log directory was created and the error log was defined direct access logs to the file
  if(fs.existsSync(path) && typeof config['access_log_name'] != 'undefined'){
    self.stdout = fs.createWriteStream(path + '/' + config['access_log_name'], {flags: 'a'});
    console.log('access log => ' + path.replace('.', process.cwd()) + '/' + config['access_log_name']);
    
  }else{
    self.stdout = process.stdout;
    console.log('No access_log_name defined in ./config/application.yaml, defaulting to stdout.');
  }

  // If the log directory was created and the error log was defined direct error logs to the file
  if(fs.existsSync(path) && typeof config['error_log_name'] != 'undefined'){
    self.stderr = fs.createWriteStream(path + '/' + config['error_log_name'], {flags: 'a'});
    console.log('error log => ' + path.replace('.', process.cwd()) + '/' + config['error_log_name']);
    
  }else{
    self.stderr = process.stderr;
    console.log('No error_log_name defined in ./config/application.yaml, defaulting to stderr.');
  }
};

// -----------------------------------------------------------------------------------------
Logger.prototype.getLogLevel = function(){ return this.logLevel; };
// -----------------------------------------------------------------------------------------
Logger.prototype.setLogLevel = function(level){ this.logLevel = typeof this.levels[level] != 'undefined' ? level : this.logLevel; }
// -----------------------------------------------------------------------------------------
Logger.prototype.getLogLevels = function(){ return _.keys(this.levels); };


// -----------------------------------------------------------------------------------------
Logger.prototype.log = function(level, message){
  var now = new Date();
  var self = this;
  
  if(self.levels[level.toString().toLowerCase()] <= self.levels[self.getLogLevel().toString().toLowerCase()]){
    if(typeof message != 'string'){
      message = JSON.stringify(message);
    };
    
    message = "\n" + level.toString().toUpperCase() + " -- " + now.toString() + " : " + message
    
    if(level.toString().toLowerCase() == 'error'){
      self.stderr.write(message);
    }else{
      self.stdout.write(message);
    }
    
    return true;
  }else{
    return false;
  }
};

// -----------------------------------------------------------------------------------------
// Make this a singleton!
global.CEDILLA_LOGGER = global.CEDILLA_LOGGER ? global.CEDILLA_LOGGER : new Logger();

module.exports = global.CEDILLA_LOGGER;