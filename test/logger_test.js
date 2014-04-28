var LOGGER = undefined;

var yaml = require('js-yaml'),
		fs = require('fs'),
		assert = require("assert"),
		config = yaml.load(fs.readFileSync(process.cwd() + '/config/application.yaml', 'utf8')),
		_ = require('underscore');
		
describe('logger.js testing', function(){
	this.timeout(10000);
	
	// ---------------------------------------------------------------------------------------------------
	before(function(done){
		LOGGER = require('../lib/logger.js');
		done();
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should have the correct logLevel!', function(){
		if(typeof config['log_level'] != 'undefined'){
			assert.equal(config['log_level'], LOGGER.getLogLevel());
		}else{
			assert.equal('warn', LOGGER.getLogLevel());
		}
		
		_.forEach(LOGGER.getLogLevels(), function(level){
			LOGGER.setLogLevel(level);
			assert.equal(level, LOGGER.getLogLevel());
		});
		
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should have the log files.', function(){
		if(typeof config['log_path'] != 'undefined' && 
				typeof config['access_log_name'] != 'undefined' &&
				typeof config['error_log_name'] != 'undefined'){

			var access = config['log_path'].replace('.', process.cwd()) + '/' + config['access_log_name'],
		    	error = config['log_path'].replace('.', process.cwd()) + '/' + config['error_log_name'];
		
			assert(fs.existsSync(access));
			assert(fs.existsSync(error));
		}
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should write to the logs', function(){
		_.forEach(LOGGER.getLogLevels(), function(level){
			assert(LOGGER.log(level, 'foo bar'));
		});
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should NOT write to the logs when the level is too high', function(){
		var last = '';
		
		_.forEach(LOGGER.getLogLevels().reverse(), function(level){
			if(last != ''){
				LOGGER.setLogLevel(level);
				assert(!LOGGER.log(last, 'foo bar'));
			}
			last = level;
		});
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('should NOT write to the logs when the level is unknown', function(){
		assert(!LOGGER.log('foo', 'foo bar'));
	});
	
});