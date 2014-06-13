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


    // look in an id field field for an identifier
    // for 0.1 this is the id field; for 1.0 it is rft.id
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
      // the pid contains "private identifiers'
      var pid = item.getAdditionalVal('pid');
      var pid_map = helper.queryStringToMap(pid);
      
      // Extract different identifiers from the id parameter
      var extractFromId = function(){
        parseId('id', 'pmid', "pmid:");
        parseId('id', 'doi', "doi:");
        parseId('id', 'issn', "issn:");
        parseId('id', 'isbn', "isbn:");
        parseId('id', 'lccn', "lccn:");
      };

      var extractFromPid = function() {
        if (!pid_map || Object.keys(pid_map).length < 1) { return ; }
        if (pid_map['dissertationNumber']) { item.addAttribute('dissertation_number', pid_map['dissertationNumber']) };
        if (pid_map['EJ_NUMBER']) { item.addAttribute('eric', pid_map['EJ_NUMBER']) };
        if (pid_map['ED_NUMBER']) { item.addAttribute('eric', pid_map['ED_NUMBER']) };
        if (pid_map['institute']) { item.addAttribute('institute', pid_map['institute']) };
        if (pid_map['OCLC']) { item.addAttribute('oclc', pid_map['OCLC']) };
        if (pid_map['oclcNumber']) { item.addAttribute('oclc', pid_map['oclcNumber']) };
        if (pid_map['publisher']) { item.addAttribute('publisher', pid_map['publisher']) };
        if (pid_map['placeOfPublication']) { item.addAttribute('publication_place', pid_map['placeOfPublication']) };
        if (pid_map['place']) { item.addAttribute('publication_place', pid_map['place']) };
      };
        
        
      // The concrete specialize method
      specializer01Impl.specialize = function(){
        item.addAttribute('ourl_version', '0.1'); 
        extractFromId();
        extractFromPid(); 
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
        var ID_KEY = "rft_id";
        parseId(ID_KEY, 'oclc', "info:oclcnum/");
        parseId(ID_KEY, 'pmid', "info:pmid/");
        parseId(ID_KEY, 'lccn', "info:lccn/"); 
        parseId(ID_KEY, 'doi', "info:doi/");
        parseId(ID_KEY, 'bibcode', "info:bibcode/");
        parseId(ID_KEY, 'hdl', "info:hdl/");
        parseId(ID_KEY, 'isbn', "urn:ISBN:");
        parseId(ID_KEY,'issn', "urn:ISSN:");
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
