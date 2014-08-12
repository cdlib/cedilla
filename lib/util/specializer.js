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
        
        //Naxos ids are encased in HTML tags, so pull the id from the tags
        _.find(_unused, function(val, key){
          if(key == 'pid' && (val.indexOf('<naxos>') >= 0 || val.indexOf('%3Cnaxos%3E') >= 0)){
            item.addAttribute('naxos', (/<naxos>(.*)<\/naxos>/.exec(val) == undefined ? /%3Cnaxos%3E(.*)%3C%2F\s?naxos%3E/.exec(val)[1] : 
                                                                                        /<naxos>(.*)<\/naxos>/.exec(val)[1]));
          }
        });
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
        parseId(ID_KEY, 'eric', "info:eric/");
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
     * Cleans up multiple authors that came through in the openUrl 
     */
    var handleMultipleAuthors = function(authors){
      var primaryAuthor = undefined;
      var auths = [];

      // The Helper class' flattenedMapToItem method will store all incoming author full names (rft.au) as an array
      _.forEach(authors, function(author){
        // If a last_name and full_name were provided (rft.aufirst, rft.aulast) then that author is the primary author!
        if(primaryAuthor == undefined && author.getAttribute('last_name')){
          primaryAuthor = author.getAttribute('last_name');
          auths.push(author);
        }

        var fulls = author.getAttribute('full_name');

        if(fulls instanceof Array){
          _.forEach(fulls, function(full){
            // This author becomes the primary if none has yet been defined
            if(primaryAuthor == undefined && full.trim() != ''){
              primaryAuthor = full;
              auths.push(author);
            
            }else{
              // If the primaryAuthor is contained within this full_name then its a duplicate otherwise its a new author
              if(full.indexOf(primaryAuthor) < 0 && full.trim() != ''){
                auths.push(new Item('author', false, {'full_name': full}));
              }
            }
          });
          
          author.removeAttribute('full_name');
          author.addAttribute(primaryAuthor);
          
        }else{
          if(fulls != undefined){
            // This author becomes the primary if none has yet been defined
            if(primaryAuthor == undefined && fulls.trim() != ''){
              primaryAuthor = fulls;
              auths.push(author);
            
            }else{
              // If the primaryAuthor is contained within this full_name then its a duplicate otherwise its a new author
              if(fulls.indexOf(primaryAuthor) < 0 && fulls.trim() != ''){
                author.removeAttribute('full_name');
                auths.push(new Item('author', false, {'full_name': fulls}));
              }
            }
          }
        }      
      });
      
      return auths;
    };
    
    /*
     * Attempt to auto-correct/detect the incoming genre and title
     */
    var assignGenre = function(item){
      var newGenre = 'article';

      // Examine the available identifiers first to see if they can tell us the genre
      if(item.getAttribute('issn') || item.getAttribute('eissn') || item.getAttribute('coden') || item.getAttribute('sici')|| item.getAttribute('eric')){

        if(typeof item.getAttribute('article_title') == 'undefined' || item.getAttribute('article_title') == ''){
          // If there are specific issue identifiers, the gerne should be issue otherwise journal
          if(item.getAttribute('issue') || item.getAttribute('volume') || item.getAttribute('season') || item.getAttribute('quarter')){
            newGenre = 'issue';
          }else{
            newGenre = 'journal';
          }

        }else{
          newGenre = 'article';
        }
        
      }else if(item.getAttribute('isbn') || item.getAttribute('eisbn') || item.getAttribute('bici')){
        // If a chapter title is present then the genre is bookitem
        if(item.getAttribute('chapter_title') || item.getAttribute('article_title')){
          newGenre = 'bookitem';
        }else{
          newGenre = 'book';
        }
      
      }else if(item.getAttribute('dissertation_number') != undefined && item.getAttribute('dissertation_number') != ''){
        newGenre = 'dissertation';
        
      }else{
        // We only have titles!
        // If an article title and a book title exist the item is a bookitem/chapter
        if(item.getAttribute('article_title') && item.getAttribute('book_title')){
          newGenre = 'bookitem';
        
        // If book title title is present its a journal
        }else if(item.getAttribute('book_title')){
          newGenre = 'book';

        }else if(!item.getAttribute('article_title')){
          // If we have a journal title see if we have any issue identifiers
          if(item.getAttribute('journal_title') && (item.getAttribute('issue') || item.getAttribute('volume') || item.getAttribute('season') || item.getAttribute('quarter'))){  
            newGenre = 'issue';
        
          // If journal title is present its a journal
          }else if(item.getAttribute('journal_title')){
            newGenre = 'journal';
          }
        }
      }

      return newGenre;
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
    
    // Handle multiple authors
    authors = handleMultipleAuthors(item.getAttribute('authors'));
    if(_.size(authors) > 0){
      item.removeAttribute('authors');
      item.addAttribute('authors', authors);
    }

    var genre = helper.getCrossReference(item.getType(), 'genre', item.getAttribute('genre'));
    if(genre == 'unknown' || genre == '' || genre == undefined){
      item.addAttribute('genre', assignGenre(item));
    }
    
    return { specialize : impl.specialize };  
  }
}
