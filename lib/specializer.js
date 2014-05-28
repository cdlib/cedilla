/*
 * The specializer object performs specialized functions to derive information from and 
 * set attributes in an item that cannot be derived and set by simple mapping. 
 *
 * The specializer object is an interface that alters an item based on its type and other 
 * characteristics. Based on an examination of the type, the specializer chooses an 
 * appropriate implementation and delegates to it. 
 * 
 * Specializers must implement the specialize() method, which operates on the item passed 
 * to the newSpecializer factory method.
 */
module.exports = {

  /*
   * Factory method for getting the appropriate specializer
   */
  newSpecializer : function(type, item) {

    /*
    * Guess the OpenURL version 
    */
    var openUrlVersion = function() {
      var additional = item.getAttributes().additional;
      var ourl_version = _.find(additional, function(i) { return i.url_ver; });
      if (ourl_version && ourl_version['url_ver'] === 'Z39.88-2004') {
        return '1.0';
      } else {
        var orig_cite = _.find(additional, function(i) { return i.original_citation; });
        if (orig_cite) {
          var keys = _.keys(helper.queryStringToMap(orig_cite['original_citation']));
          if (_.find(keys, function(i) { return i.substring(0, 3) === 'rft'; })) {
            return '1.0';
          }
        }
      }
      return '0.1';
    };
 
    var newOURL01Specializer = function() {
      var specializer01Impl = {};
      // TODO: the actual specialization code
      specializer01Impl.specialize = function(){
        item.addAttribute('ourl_version', '0.1'); 
      }; 
      return specializer01Impl;
    };

    var newOURL10Specializer = function() {
      var specializer10Impl = {};
      // TODO: the actual specialization code
      specializer10Impl.specialize = function(){
        item.addAttribute('ourl_version', '1.0');
      };
      return specializer10Impl;
    };

    /*
     * Decides what type of openurl it is and returns the appropriate specializer.
     */
    var newOpenURLSpecializer = function(){
      var ourlVersion = openUrlVersion();
      var impl;
      if (ourlVersion === '0.1') {
        impl = newOURL01Specializer();
      } else if (ourlVersion === '1.0') {
          impl = newOURL10Specializer();
      }
      return impl;
    };


    /*
     * Maps the type of the citation item to 
     * the specializer for that type.
     */
    var impl_map = {
      'openurl' : newOpenURLSpecializer()
    }
    
    return impl_map[type];  
  }
}
