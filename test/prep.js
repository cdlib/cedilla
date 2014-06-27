var _rootItemType = '',
    _emptyItem = undefined,
    _bareMinimumItem = undefined,
    _fullItem = undefined,
    _fullItemWithChildren = undefined,
    _attributeMaps = {},
    _serviceNameToDisplayName = {},
    _serviceDisplayNameToName = {},
    _dispatchAlways = [],
    _definedServices = [],
    _tierServices = {};
    
// Wait for the config file and init.js have finished loading before starting up the server
var delayStartup = setInterval(function(){
  if(typeof Item != 'undefined'){
    clearInterval(delayStartup);
    
    // ------------------------------------------------------------------------------------------------
    // ITEMS
    // ------------------------------------------------------------------------------------------------
    //Build the entire attribute map for the specified item
    var buildAttributeMap = function(type){
      var params = {};
  
      if(CONFIGS['data']['objects'][type]){
        _.forEach(CONFIGS['data']['objects'][type]['attributes'], function(attribute){
          params[attribute] = 'foo-bar';
        });
      }
      return params;
    };

    // Build the entire attribute map for each item
    _.forEach(CONFIGS['data']['objects'], function(def, type){
      if(def['root']){
        _rootItemType = type;
      }
      _attributeMaps[type] = buildAttributeMap(type);
    });

    // Build the various versions of the root item
    var def = CONFIGS['data']['objects'][_rootItemType],
        params = {};
    
    _emptyItem = new Item(_rootItemType, false, {});

    // Manually build the validations instead of using the item's constructor option because
    // we want to use it for testing verification!
    _.forEach(def['validation'], function(attribute){
      params[attribute] = 'got it';
    });

    // Bare Minimum item has ONLY the defined validation attributes set
    _bareMinimumItem = new Item(_rootItemType, false, params);
    
    params = buildAttributeMap(_rootItemType);
    
    // Full item has ALL of its defined attributes set
    _attributeMaps[_rootItemType] = params;
    _fullItem = new Item(_rootItemType, false, params);
    _fullItemWithChildren = new Item(_rootItemType, false, params);

    // Build out each of the child items and attach them to the itemWithChildren
    _.forEach(def['children'], function(child){
      var map = buildAttributeMap(child);
  
      _attributeMaps[child] = map;
      _fullItemWithChildren.addAttribute(child + 's', [new Item(child, false, map)]);
    });

    // ------------------------------------------------------------------------------------------------
    // SERVICES
    // ------------------------------------------------------------------------------------------------
    _dispatchAlways = CONFIGS['rules']['dispatch_always'];
    
    _.forEach(CONFIGS['services']['tiers'], function(services, tier){
      _.forEach(services, function(def, name){
        _definedServices.push(name);
        
        _serviceNameToDisplayName[name] = def['display_name'] || name;
        
        if(!_tierServices[tier]){ _tierServices[tier] = []; };
        _tierServices[tier].push(name);
      });
    });

    _.forEach(_serviceNameToDisplayName, function(display, name){
      _serviceDisplayNameToName[display] = name;
    });

    // Delete any dispatch_always services that were NOT defined in services.yaml!
    _.forEach(_dispatchAlways, function(svc){
      if(!_.contains(_definedServices, svc)){
        _dispatchAlways.splice(_dispatchAlways.indexOf(svc), 1);
      }
    });
    
    
    // ------------------------------------------------------------------------------------------------
    module.exports = rootItemType = _rootItemType;
    module.exports = emptyItem = _emptyItem;
    module.exports = bareMinimumItem = _bareMinimumItem;
    module.exports = fullItem = _fullItem;
    module.exports = fullItemWithChildren = _fullItemWithChildren;
    
    module.exports = totalServiceCount = _.size(_definedServices);
    module.exports = allServices = _definedServices;
    module.exports = tierServiceCount = _.size(_tierServices);
    module.exports = tierServices = _tierServices;
    module.exports = dispatchAlwaysServiceCount = _.size(_dispatchAlways);
    module.exports = dispatchAlwaysServices = _dispatchAlways;
    
    module.exports = getTierNameForService = function(serviceName){ 
      var ret = '';
      _.forEach(_tierServices, function(services, tier){ if(_.contains(services, serviceName)){ ret = tier; } });
      return ret;
    };
    
    module.exports = serviceNameToDisplayName = function(name){ return _serviceNameToDisplayName[name]; }
    module.exports = serviceDisplayNameToName = function(name){ return _serviceDisplayNameToName[name]; }
  }
});