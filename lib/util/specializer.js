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
  newSpecializer : function(input_type, item, request) {
    var _unused = helper.queryStringToMap(request.getUnmapped());
    var _orig_cite = request.getRequest();
    /*
    * Guess the OpenURL version 
    */
    var openUrlVersion = function() {
      var version = _unused['url_ver'];
      if (version === 'Z39.88-2004') {
        return '1.0';
      } else {
        if (_orig_cite) {
          var keys = _.keys(helper.queryStringToMap(_orig_cite));

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
      if(_unused[key]){
        var ids_ind = _unused[key].toString().replace('[', '').replace(']', '').split(','),
            ids = undefined;
      
        _.forEach(ids_ind, function(id){
          if(id.toString().indexOf(prefix) == 0){
            ids = id.replace(prefix, '');
          }
        });

        if(ids){
          item.addAttribute(attrib, ids);
        }
      }
    };

 
    /*
     * Specializer implementation for OpenURL 0.1
     */
    var newOURL01Specializer = function() {

      var specializer01Impl = {};
      // the pid contains "private identifiers'
      var pid = _unused['pid'];
      
      // Extract different identifiers from the id parameter
      var extractFromId = function(){
        parseId('id', 'pmid', "pmid:");
        parseId('id', 'doi', "doi:");
        parseId('id', 'issn', "issn:");
        parseId('id', 'isbn', "isbn:");
        parseId('id', 'lccn', "lccn:");
      };

      var extractFromPid = function() {
				if (!_unused || Object.keys(_unused).length < 1) { return ; }
        if (_unused['dissertationNumber']) { item.addAttribute('dissertation_number', _unused['dissertationNumber']) };
        if (_unused['EJ_NUMBER']) { item.addAttribute('eric', _unused['EJ_NUMBER']) };
        if (_unused['ED_NUMBER']) { item.addAttribute('eric', _unused['ED_NUMBER']) };
        if (_unused['institute']) { item.addAttribute('institute', _unused['institute']) };
        if (_unused['OCLC']) { item.addAttribute('oclc', _unused['OCLC']) };
        if (_unused['oclcNumber']) { item.addAttribute('oclc', _unused['oclcNumber']) };
        if (_unused['publisher']) { item.addAttribute('publisher', _unused['publisher']) };
        if (_unused['placeOfPublication']) { item.addAttribute('publication_place', _unused['placeOfPublication']) };
        if (_unused['place']) { item.addAttribute('publication_place', _unused['place']) };
      };
        
        
      // The concrete specialize method
      specializer01Impl.specialize = function(){
        extractFromId();
        extractFromPid(); 
        
        return 'openurl-0.1';
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
          rfe_dat_field = _unused['rfe_dat'];
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
      specializer10Impl.specialize = function(unmapped){
        extractFromRfeDat();
        extractFromRftId();
        
        return 'openurl-1.0';
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