require('../init.js');

var assert = require("assert");
    
describe('config.js testing', function(){
  this.timeout(10000);
  
  var _config_refs = {};
  
  // ---------------------------------------------------------------------------------------------------
  before(function(done){
    //var self = this;
    
    // Scan file for config references
    _scanFile = function(file){
      fs.readFile(file, function(err, data){
        if(err){
          throw err;
        }
        
        var matches = data.toString().match(/CONFIGS(\['[a-zA-Z0-9_\-]+'\])+/g);
        var matches2 = data.toString().match(/_buildError\(_transactionId, '[a-z]+', '[a-zA-Z-0-9_\-]+/g);
        
        if(_.size(matches) > 0){
          _.forEach(matches, function(match){
            var cleaned = match.replace('CONFIGS', '').replace(/'/g, '').replace('][', ',').replace('[', '').replace(']', '');
            var hierarchy = cleaned.split(',');
              
            if(typeof _config_refs[hierarchy[0]] == 'undefined'){
              _config_refs[hierarchy[0]] = [];
            }
            
            if(hierarchy.length > 1){
              var exists = false;
              
              _.forEach(_config_refs[hierarchy[0]], function(item){
                if(item.toString() == hierarchy.slice(1, hierarchy.length).toString()) exists = true;
              });
              
              if(!exists) _config_refs[hierarchy[0]].push(hierarchy.slice(1, hierarchy.length));
            }
          });
        }
        
        if(_.size(matches2) > 0){
          _.forEach(matches2, function(match){
            var cleaned = [match.replace("'warning'", '').replace("'error'", '').replace("'fatal'", '').replace("_buildError(_transactionId, , '", '')] ;
            
            if(typeof _config_refs['message'] == 'undefined') _config_refs['message'] = [];
            
            var exists = false;
            
            _.forEach(_config_refs['message'], function(item){
              if(item.toString() == cleaned.toString()) exists = true;
            });
            
            if(!exists) _config_refs['message'].push(cleaned);
          });
        }
        
      });
    };
    
    // Pull in every JS file and pull out all of the references to config values
    _.forEach(['/', '/lib/'], function(path){
      var root = __dirname.replace('/test', path);
      
      fs.readdir(root, function(err, files){
        files.forEach(function(file){
          if(file.indexOf('.js') > 0){
            _scanFile(root + file);
          }
        });
      });
    })
    
    done();
  });
  
  // ---------------------------------------------------------------------------------------------------
  it('should have loaded ALL of the YAML files!', function(){
    console.log('CONFIG: verifying that all yaml configs were loaded!');
    
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

  // ---------------------------------------------------------------------------------------------------
  it('attributes referenced in validation and default must appear in attributes list!', function(){
    
    console.log('CONFIG: Verifying that all item defaults and validation referenced in /config/data.yaml are also listed in the items attributes section.');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      var _attributes = [];
      
      _.forEach(def['attributes'], function(attribute){        
        if(!_.contains(_attributes, attribute)) _attributes.push(attribute);
      });
      
      _.forEach(def['validation'], function(attribute){
        if(attribute instanceof Array){
          _.forEach(attribute, function(attr){
            if(!_.contains(_attributes, attr)){
              console.log('.... ' + type + ' specifies ' + attr + ' as a validation item, but it is not one of the defined attributes!');
              assert(1 == 0);
            }  
          });
          
        }else{
          if(!_.contains(_attributes, attribute)){
            console.log('.... ' + type + ' specifies ' + attribute + ' as a validation item, but it is not one of the defined attributes!');
            assert(1 == 0);
          }
        }
      });
      
      _.forEach(def['default'], function(value, attribute){
        if(!_.contains(_attributes, attribute)){
          console.log('.... ' + type + ' specifies ' + attribute + ' as a default item, but it is not one of the defined attributes!');
          assert(1 == 0);
        }
      });
      
    });
    
  });
  
  // ---------------------------------------------------------------------------------------------------
  it('children defined for an item must also have a definition!', function(){
    var _types = [];
    
    console.log('CONFIG: verifying that all children defined for each data type are themselves defined in data.yaml');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      _types.push(type);
    });
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      _.forEach(def['children'], function(child){
        if(!_.contains(_types, child)){
          console.log('.... ' + child + ' is defined as a child of ' + type + ' but that item type has no definition in config/data.yaml!');
          assert(1 == 0);
        }
      });
    });
  });
  
  // ---------------------------------------------------------------------------------------------------
  it('must have at least one root item!', function(){
    var rootCount = 0;
    
    console.log('CONFIG: verifying that at least item is designated as the root item!');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      if(def['root']) rootCount++;
    });
    
    if(rootCount == 0) console.log('.... One of the data types defined in config/data.yaml must be declared as the root object! "root: true"!');
    assert.equal(1, rootCount);
    
  });

  // ---------------------------------------------------------------------------------------------------
  it('each reference to a config value should have a vlaue in a config!', function(){
    console.log('CONFIG: Validating configuration file references');
    
    // Loop through each config file reference
    _.forEach(_config_refs, function(refs, config){
      // Loop through each reference
      _.forEach(refs, function(ref){
        var passed = true;
        
        // Exclude checks for the temporary default service line and the optional consortial service
        if(!_.contains(ref, 'default_content_service') && !_.contains(ref, 'default_content_service_port') && !_.contains(ref, 'consortial_service')){
          // Warning, can only currently chek up to 4 levels deep
          switch(ref.length){
          case 1:
            passed = typeof CONFIGS[config] != 'undefined';
            if(passed) passed = typeof CONFIGS[config][ref[0]] != 'undefined';
            break;
          case 2:
            passed = typeof CONFIGS[config] != 'undefined';
            if(passed) typeof CONFIGS[config][ref[0]] != 'undefined';
            if(passed) typeof CONFIGS[config][ref[0]][ref[1]] != 'undefined';
            break;
          case 3:
            passed = typeof CONFIGS[config] != 'undefined';
            if(passed) typeof CONFIGS[config][ref[0]] != 'undefined';
            if(passed) typeof CONFIGS[config][ref[0]][ref[1]] != 'undefined';
            if(passed) typeof CONFIGS[config][ref[0]][ref[1]][ref[2]] != 'undefined';
            break;
          case 4:
            passed = typeof CONFIGS[config] != 'undefined';
            if(passed) typeof CONFIGS[config][ref[0]] != 'undefined';
            if(passed) typeof CONFIGS[config][ref[0]][ref[1]] != 'undefined';
            if(passed) typeof CONFIGS[config][ref[0]][ref[1]][ref[2]] != 'undefined';
            if(passed) typeof CONFIGS[config][ref[0]][ref[1]][ref[2]][ref[3]] != 'undefined';
            break;
          default:
            passed = typeof CONFIGS[config] != 'undefined';
            break;
          }
        }
        
        if(!passed) console.log('.... "' + ref + '" does not exist in /config/' + config + '.yaml!');
        assert(passed);
        
      });
    });
  });

  // ---------------------------------------------------------------------------------------------------
  it('should have services defined in /config/services.yaml', function(){
    var _services = [];
    
    console.log('CONFIG: Verifying that at least one service is defined in /config/services.yaml');
    
    // Make sure that the services are set under the tiers structure
    assert(typeof CONFIGS['services']['tiers'] != 'undefined');
    
    _.forEach(CONFIGS['services']['tiers'], function(services, tier){
      _.forEach(services, function(def, service){
        if(!_.contains(_services, service)) _services.push(service);
      });
    });
    
    // Make sure that there ARE services defined in /config/services.yaml
    assert(_.size(_services) > 0);
  });

  // Validate service targets
  // ---------------------------------------------------------------------------------------------------
  it('should have valid URL targets for each service in /config/services.yaml', function(){
    console.log('CONFIG: verifying that valid targets are defined for each service');
    
    var pattern = new RegExp('^(https?:\/\/)?'+ // protocol
                             '((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|'+ // domain name
                             '((\d{1,3}\.){3}\d{1,3}))'+ // OR ip (v4) address
                             '(\:\d+)?(\/[-a-z\d%_.~+]*)*');//+ // port and path
 //                            '(\?[;&a-z\d%_.~+=-]*)?'+ // query string
   //                          '(\#[-a-z\d_]*)?$'); // fragment locater
  
    // Make sure every service has a target and item_types_returned!
    _.forEach(CONFIGS['services']['tiers'], function(services, tier){
      _.forEach(services, function(def, service){
        var passed = (typeof def['target'] != 'undefined');
        if(passed) passed = pattern.test(def['target']);

        if(!passed) console.log('.... service ' + service + ' MUST specify a valid URL for "target"!');
        assert(passed);
      });
    });
  });
  
  // Validate service item_types_returned
  // ---------------------------------------------------------------------------------------------------
  it('each item_type_returned for a service defined in /config/services.yaml should match an item type defined in /config/data.yaml!', function(){
    console.log('CONFIG: verifying that each item type specified in services.yaml exists in data.yaml');
    
    var _items = [];
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      _items.push(type);
    });
    
    // Make sure every service has an item_types_returned and that the types are valid!
    _.forEach(CONFIGS['services']['tiers'], function(services, tier){
      _.forEach(services, function(def, service){
        var passed = (def['item_types_returned'] instanceof Array);

        if(passed){
          _.forEach(def['item_types_returned'], function(type){
            if(passed) passed = _.contains(_items, type);
          });
        }
        
        if(!passed) console.log('.... service ' + service + ' MUST specify a "target" and an array of "item_types_returned"!');
        assert(passed);
      });
    });
  });
  
  // ---------------------------------------------------------------------------------------------------
  it('each service referenced in /config/rules.yaml should exist in /config/services.yaml!', function(){
    var _services = [];
    
    console.log('CONFIG: Verifying that all services referenced in /config/rules.yaml are defined in /config/services.yaml');
    
    _.forEach(CONFIGS['services']['tiers'], function(services, tier){
      _.forEach(services, function(def, service){
        if(!_.contains(_services, service)) _services.push(service);
      });
    });
  
    var defined = [];
    
    _.forEach(CONFIGS['services']['tiers'], function(svcs, tier){
      _.forEach(svcs, function(def, svc){
        if(def['enabled']){
          defined.push(svc);
        }
      });
    });
  
    // Check the dispatch always
    _.forEach(CONFIGS['rules']['dispatch_always'], function(service){
      if(_.contains(defined, service)){
        var passed = _.contains(_services, service);
      
        if(!passed){
          console.log('.... "' + service + '" was referenced in dispatch_always was not defined in /config/services.yaml');
        }
      
        assert(passed);
      }
    });
    
    // Check each item-attribute-value association
    _.forEach(CONFIGS['rules']['objects'], function(attributes, item){
      _.forEach(attributes, function(values, attribute){
        _.forEach(values, function(services, value){
          _.forEach(services, function(service){
            var passed = _.contains(_services, service);
            
            if(!passed){
              console.log('.... "' + service + '" was referenced at ' + item + '-->' + attribute + '-->' + value + ' but was not defined in /config/services.yaml');
            }
            
            assert(passed);
          });
        })
      })
    });
    
    // Check the Minimum Attribute associations
    _.forEach(CONFIGS['rules']['minimum_item_groups'], function(rules, service){
      var passed = _.contains(_services, service);
      
      if(!passed){
        console.log('.... "' + service + '" was referenced in the minimum_item_group section but was not defined in /config/services.yaml');
      }
      
      assert(passed);
    });
    
  });
  
  // ---------------------------------------------------------------------------------------------------
  it('each item referenced in /config/rules.yaml should be defined in /config/data.yaml!', function(){
    var _items = [];
    
    console.log('CONFIG: Verifying that all item types referenced in /config/rules.yaml is defined in /config/data.yaml.');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      if(!_.contains(_items, type)) _items.push(type);
    });
    
    _.forEach(CONFIGS['rules']['objects'], function(attributes, item){
      var passed = _.contains(_items, item);
      
      if(!passed) console.log('.... item ' + item + ' was referenced but not defined in /config/data.yaml!')
      assert(passed);
    });
  });
  
  // ---------------------------------------------------------------------------------------------------
  it('each item attribute referenced in /config/rules.yaml should be defined in /config/data.yaml!', function(){
    var _attributes = {},
        _rootItem = '';
    
    console.log('CONFIG: Verifying that all item types referenced in /config/rules.yaml is defined in /config/data.yaml.');
    
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      if(def['root']) _rootItem = type;
      
      _.forEach(def['attributes'], function(attribute){
        if(typeof _attributes[type] == 'undefined') _attributes[type] = [];
        
        if(!_.contains(_attributes[type], attribute)) _attributes[type].push(attribute);
      });
      
      _.forEach(def['children'], function(attribute){
        if(typeof _attributes[type] == 'undefined') _attributes[type] = [];
        
        if(!_.contains(_attributes[type], attribute + 's')) _attributes[type].push(attribute + 's');
      });
    });
    
    // Check the item attribute value rules
    _.forEach(CONFIGS['rules']['objects'], function(attributes, item){
      _.forEach(attributes, function(values, attribute){
        var passed = _.contains(_attributes[item], attribute);
      
        if(!passed) console.log('.... item ' + item + ' references attribute ' + attribute + ' but that attribute is not defined in /config/data.yaml!')
        assert(passed);
      });
    });
    
    // Check the minimum item group rules
    _.forEach(CONFIGS['rules']['minimum_item_groups'], function(rules, service){
      _.forEach(rules, function(andRule){
        var passed = false;
        
        if(andRule instanceof Array){
          _.forEach(andRule, function(orRule){
            var passed = _.contains(_attributes[_rootItem], orRule) || orRule == 'CONSORTIAL';
            
            if(!passed) console.log('.... service ' + service + ' references attribute ' + orRule + ' but that attribute is not defined in /config/data.yaml!')
            assert(passed);
          });
          
        }else{
          var passed = _.contains(_attributes[_rootItem], andRule) || andRule == 'CONSORTIAL';
          
          if(!passed) console.log('.... service ' + service + ' references attribute ' + andRule + ' but that attribute is not defined in /config/data.yaml!')
          assert(passed);
        }
        
      });
    })
  });
  
});

// ---------------------------------------------------------------------------------------------------
function loadConfigs(callback){
  CONFIGS = require('../lib/config.js');
  callback();
}
