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
   * @param input_type a string naming the input type of the citation, for example 'openurl'
   * @param item Item object that models the citation
   */
  newSpecializer : function(input_type, item) {

    /*
    * Guess the OpenURL version 
    */
    var openUrlVersion = function() {
      var additional = item.getAttributes().additional;
      var version = item.getAdditional('url_ver'); 
      if (version === 'Z39.88-2004') {
        return '1.0';
      } else {
        var orig_cite = _.find(additional, function(i) { return i.original_citation; });
        if (orig_cite) {
          var keys = _.keys(helper.queryStringToMap(orig_cite['original_citation']));
          if (_.find(keys, function(i) { return i.substring(0, 4) === 'rft.'; })) {
            return '1.0';
          }
        }
      }
      return '0.1';
    };
 
    /*
     * Implementation for OpenURL 0.1
     */
    var newOURL01Specializer = function() {
      var specializer01Impl = {};
      // TODO: the actual specialization code
      specializer01Impl.specialize = function(){
        item.addAttribute('ourl_version', '0.1'); 
      }; 
      return specializer01Impl;
    };

    /*
     * Implemenation for OpenURL 1.0
     */
    var newOURL10Specializer = function() {
      var specializer10Impl = {};

      // parse the rfe_dat field to look for an oclc number
      var extractFromRfeDat = function () {
         if (!item.oclc) {
          // see if there is an oclc number in rfe_dat field
          // TODO: if this is an array of values, search for the accessionnumber
          // there are no examples of multiple rfe_dat in Request tests
          rfe_dat_field = item.getAdditionalVal('rfe_dat');
          if (rfe_dat_field) {
            var parse_result = /<accessionnumber>(.*)<\/accessionnumber>/.exec(rfe_dat_field);
            if (parse_result) {
              item.addAttribute('oclc', parse_result['1']);
            }
          }
        }
      };


      // look in the rft_id field for an identifier
      var parseRftId = function (attrib, prefix) {
        // the type of the result is indeterminate
        // it could be an array or a string
        var rft_ids_ind = item.getAdditionalVal('rft_id');
        var rft_ids = [];
        if (typeof(rft_ids_ind) === 'string') {
          rft_ids['0'] = rft_ids_ind;        
        } else {
          rft_ids = rft_ids_ind; 
        }
        if (rft_ids.length < 1) return;
        if (!item.hasAttribute(attrib)) {
          var id_str =_.find(rft_ids, function(i) { return i.search(prefix) === 0 }); 
          if (id_str) {
            var id_n = id_str.substr(prefix.length);
            item.addAttribute(attrib, id_n);
          } 
        }
      };

      var extractFromRftId = function () {
        var OCLC_PREFIX = "info:oclcnum/";
        var ISBN_PREFIX = "urn:ISBN:";
        var ISSN_PREFIX = "urn:ISSN:";
        parseRftId('oclc', OCLC_PREFIX);
        parseRftId('isbn', ISBN_PREFIX);
        parseRftId('issn', ISSN_PREFIX);
      };

      // the concrete specializer method 
      specializer10Impl.specialize = function(){
        item.addAttribute('ourl_version', '1.0');
        extractFromRfeDat();
        extractFromRftId();
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
    
    // get a specializer for the input type
    // then return just the interface
    var impl = impl_map[input_type];
    return { specialize : impl.specialize };  
  }
}
