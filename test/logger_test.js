var LOGGER = undefined;

var yaml = require('js-yaml'),
    fs = require('fs'),
    assert = require("assert"),
    _ = require('underscore');

var config = undefined;

if(fs.existsSync(process.cwd() + '/config/application.yaml')){
  config = yaml.load(fs.readFileSync(process.cwd() + '/config/application.yaml', 'utf8'));  
}else{
  config = yaml.load(fs.readFileSync(process.cwd() + '/config/application.example', 'utf8'));
}

describe('logger.js testing', function(){
  this.timeout(10000);
  
  // ---------------------------------------------------------------------------------------------------
  before(function(done){
    LOGGER = require('../lib/logger.js');
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  it('should have the correct logLevel!', function(){
    
    console.log('LOGGER: checking log levels');
    
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
    
    console.log('LOGGER: checking that files get created');
    
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
    
    console.log('LOGGER: verifying write');
    
    _.forEach(LOGGER.getLogLevels(), function(level){
      assert(LOGGER.log(level, 'foo bar'));
    });
  });
  
  // ---------------------------------------------------------------------------------------------------
  it('should NOT write to the logs when the level is too high', function(){
    var last = '';
    
    console.log('LOGGER: verifying that log level restricts what is written');
    
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
    
    console.log('LOGGER: verifying that unknown log level results in no message');
    
    assert(!LOGGER.log('foo', 'foo bar'));
  });
  
});