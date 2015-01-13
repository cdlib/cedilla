var fs = require('fs');
var _ = require('underscore');
var yaml = require('js-yaml');

var sources = [], data = {};

/* -----------------------------------------------------------------------------------------
 * CONFIG: Loads the definitions located in all the yaml configuration files into a HashMap
 *         that can then be referenced throughout the application as a Singleton instance.
 *
 * This module watches the configuration files for changes and reloads them if they are 
 * updated. This prevents the need to restart the system due to a simple configuratrion 
 * change. This also however makes it dangerous to update the yaml files because if the change 
 * makes the config invalid Yaml then the application will terminate.
 * -----------------------------------------------------------------------------------------
 */
var Configs = function() {

  // Load the core config files
  loadFileConfigs(process.cwd() + '/config', undefined);

  // Load the translator mapping files
  loadFileConfigs(process.cwd() + '/config/translators', 'translators');

  // Load the parser mapping files
  loadFileConfigs(process.cwd() + '/config/parsers', 'parsers');

  // Setup watchers for the config files we've loaded
  watchFilesForChanges();
};

// -----------------------------------------------------------------------------------------    
Configs.prototype.getData = function() {
  console.log(data);
  return data;
};

// -----------------------------------------------------------------------------------------  
var loadFileConfigs = function(dir, prefix) {

  // If a prefix was included, create an empty hash for it if it doesn;t exist
  if (prefix) {
    if (!data[prefix]) {
      data[prefix] = {};
    }
  }

  // Loop through the files in the specified dir
  fs.readdir(dir, function(err, files) {
    console.log('loading configuration files from ' + dir);

    files.forEach(function(file) {
      // If the file is a YAML file
      if (file.indexOf('.yaml') > 0 || file.indexOf('.yml') > 0) {
        var fileName = file.replace('.yaml', '').replace('.yml', '').toLowerCase().trim();
        var contents;

        try {
          contents = yaml.load(fs.readFileSync(dir + '/' + file, 'utf8'));

        } catch (e) {
          console.log("Unable to load " + file + ": " + e.message);
        }

        // Attach it to the object's list of sources and then its contents onto the global config
        sources.push(new Array({'path': dir, 'file': file, 'source': contents}));

        if (prefix) {
          data[prefix][fileName] = contents;

        } else {
          data[fileName] = contents;
        }
      }

    });

    // Load the example yaml files if no yaml was present!!
    files.forEach(function(file) {
      // If the file is a EXAMPLE file
      if (file.indexOf('.example') > 0) {
        var fileName = file.replace('.example', '').toLowerCase().trim();
        var contents;

        if ((prefix ? typeof data[prefix][fileName] === 'undefined' : typeof data[fileName] === 'undefined')) {
          console.log('WARNING! No copy of the ' + fileName + ' configuration file was found! Using the example instead.');

          try {
            contents = yaml.load(fs.readFileSync(dir + '/' + file, 'utf8'));

          } catch (e) {
            console.log("Unable to load " + file + ": " + e.message);
          }

          // Attach it to the object's list of sources and then its contents onto the global config
          sources.push(new Array({'path': dir, 'file': file, 'source': contents}));
          data[fileName] = contents;
        }
      }

    });
  });

};

// -----------------------------------------------------------------------------------------
var watchFilesForChanges = function() {

  // Loop through the registered sources
  _.forEach(sources, function(source) {
    var path = source[0].path.toString() + '/' + source[0].file.toString();
    var fileName = source[0].file.toString().replace('.yaml', '').replace('.yml', '').toLowerCase().trim();

    // Setup a listener for file changes
    fs.watchFile(path, function(curr, prev) {

      if (curr.mtime > prev.mtime) {
        var contents = yaml.load(fs.readFileSync(path, 'utf8'));

        console.log('.. configuration change detected, reloading ' + fileName);

        // Reload the contents into the global config
        data[fileName] = contents;
      }

    });
  });
};

// -----------------------------------------------------------------------------------------
// Make this a singleton!
global.CEDILLA_CONFIGS = global.CEDILLA_CONFIGS ? global.CEDILLA_CONFIGS : new Configs().getData();

module.exports = exports = global.CEDILLA_CONFIGS;
