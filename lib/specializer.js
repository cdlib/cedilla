/*
 * The specializer object performs specialized functions to derive information from and 
 * set attributes in an item that cannot be derived and set by simple mapping. 
 *
 * The specializer object is an interface that alters an item based on its type and other 
 * characteristics. Based on an examination of the type, the specializer chooses an 
 * appropriate implementation and delegates to it. 
 */
var newSpecializer = function(item) {
  var impl;

  /*
   * Decides what type of openurl it is and returns the appropriate specializer.
   */
  var newOpenURlSpecializer = function(){
    var ourlVersion = openUrlVersion();
    if (ourlVersion === '0.1') {
      impl = newOURL01Specializer();
    } else if (ourlVersion === '1.0') {
        impl = newOURL10Specializer();       
      } 
  };
  
  /*
   * Look for signs of the OpenURL version number.
   * TODO: Can the url_ver field be relied upon or do we have 
   * to look at the params namespaces?
   */
  var openUrlVersion() = function() {
    var attribs = item.getAttributes();
    var additional = attribs.additional;
    if (additional['url_ver'] === 'Z39.88-2004') {
      return '1.0';
    } else {
      return '0.1';
    }
  };
 
  var newOURL01Specializer() = function() {
    LOGGER.log('debug', 'Getting 01 specializer');
    var specializer01Impl = {};
    specializer01Impl.specialize = function(){
      item.addAttribute('ourl_version', '0.1'); 
    }; 
    return specializer01Impl;
  };

  var newOURL10Specializer() = function() {
    LOGGER.log('debug', 'Getting 10 specialier');
    var specializer10Impl = {};
    specializer10Impl.specialize = function(){
      item.addAttribute('ourl_version', '1.0');
    };
    return specializer10Impl;

  };

  switch(item.getType()) {
  case 'openurl':
    impl = newOpenURlSpecializer(item);  
    break; 
  default:
    throw "unexpected type not handled by specializer!"
  } 
  return {
    specialize : impl.specialize;
  };
};

