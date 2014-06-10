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
        var orig_cite = item.getAttribute('original_citation');
        if (orig_cite) {
          var keys = _.keys(helper.queryStringToMap(orig_cite));
          if (_.find(keys, function(i) { return i.substring(0, 4) === 'rft.'; })) {
            return '1.0';
          }
        }
      }
      return '0.1';
    };


    // look in the rft_id field for an identifier
    var parseId = function (key, attrib, prefix) {
      //console.log("Calling parseId with key = " + key + "; attrib = " + attrib + "; prefix = " + prefix);
      // the type of the result is indeterminate
      // it could be an array or a string
      var ids_ind = item.getAdditionalVal(key);
      if (!ids_ind) { return; };
      var ids = [];
      if (typeof(ids_ind) === 'string') {
        //console.log("Value for key " + key + ": " + ids_ind);
        ids['0'] = ids_ind;
      } else {
        ids = ids_ind;
      }
      if (ids.length < 1) { return; }
      if (!item.hasAttribute(attrib)) {
        var id_str =_.find(ids, function(i) { return i.search(prefix) === 0 });
        if (id_str) {
          var id_n = id_str.substr(prefix.length);
          //console.log("Extracted id: " + id_n);
          item.addAttribute(attrib, id_n);
          //console.log("Added attribute, item is " + item);
        }
      }
    };

 
    /*
     * Specializer implementation for OpenURL 0.1
     */
    var newOURL01Specializer = function() {

      var specializer01Impl = {};
      var pid = item.getAdditionalVal('pid');
      
      // Extract different identifiers from the id parameter
      var extractFromId = function(){
        var PMID_PREFIX = "pmid:";
        parseId('id', 'pmid', PMID_PREFIX);
      };

      // The concrete specialize method
      specializer01Impl.specialize = function(){
        item.addAttribute('ourl_version', '0.1'); 
        extractFromId();
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

      var extractFromRftId = function () {
        var OCLC_PREFIX = "info:oclcnum/";
        var ISBN_PREFIX = "urn:ISBN:";
        var ISSN_PREFIX = "urn:ISSN:";
        parseId('rft_id', 'oclc', OCLC_PREFIX);
        parseId('rft_id', 'isbn', ISBN_PREFIX);
        parseId('rft_id', 'issn', ISSN_PREFIX);
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
