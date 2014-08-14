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
var Parser = function(openurl) {
/*
 * Factory method for getting the appropriate specializer
 * @param input_type a string naming the input type of the citation, for example 'openurl'
 * @param item Item object that models the citation
 */
  this._openurl = openurl;
  this._params = helper.queryStringToMap(openurl);
  
  /*
  * Guess the OpenURL version 
  */
  this._version = '0.1';
  
  if(this._params['url_ver'] === 'Z39.88-2004'){
    this._version = '1.0';
  
  }else{
    var keys = _.keys(this._params);

    if (_.find(keys, function(i) { return i.substring(0, 4) === 'rft.'; })) {
      this._version = '1.0';
    }
  }
  
  // ---------------------------------------------------------------------------------------------
  // Look for ids in the specified value
  // ---------------------------------------------------------------------------------------------
  this._parseId = function (item, val, hash) {
    _.forEach(hash, function(prefix, key){
      var ids_ind = val.toString().replace('[', '').replace(']', '').split(',');

      _.forEach(ids_ind, function(id){
        if(prefix instanceof Array){
          var cleanId = id;
          _.forEach(prefix, function(prfx){
            if(id.toString().indexOf(prfx) >= 0){
              cleanId = cleanId.replace(prfx, '');
            }
          });
          item.addAttribute(key, cleanId);
          
        }else{
          if(id.toString().indexOf(prefix) == 0){
            item.addAttribute(key, id.replace(prefix, ''));
          }
        }
      });
    });
  };
  
  // ---------------------------------------------------------------------------------------------
  // Cleans up multiple authors that came through in the openUrl 
  // ---------------------------------------------------------------------------------------------
  this._handleMultipleAuthors = function(item){
    var primaryAuthor = undefined;
    var auths = [];

    // The Helper class' flattenedMapToItem method will store all incoming author full names (rft.au) as an array
    _.forEach(item.getAttribute('authors'), function(author){
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
    
    if(_.size(auths) > 0){
      item.removeAttribute('authors');
      item.addAttribute('authors', auths);
    }
  };
  
  // ---------------------------------------------------------------------------------------------
  // Attempt to auto-correct/detect the incoming genre and title
  // ---------------------------------------------------------------------------------------------
  this._assignGenre = function(item){
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

    item.addAttribute('genre', assignGenre(item));
  };
}

// -----------------------------------------------------------------------------------------------
util.inherits(Parser, events.EventEmitter);

// ---------------------------------------------------------------------------------------------
// Construct the initial items from the incoming openUrl
// ---------------------------------------------------------------------------------------------
Parser.prototype.buildItemsFromQueryString = function(queryString, callback){
  var qs = helper.queryStringToMap(queryString);

  // Toss any parameters that had a blank value!
  _.forEach(qs, function(v, k){
    if(v == ''){
      delete qs[k];
    }
  });

  var translator = new Translator('openurl');

  // Translate the openUrl keys to ones usable by our items
  var map = translator.translateMap(qs, false);
  LOGGER.log('debug', 'translated flat map: ' + JSON.stringify(map));

  // Create an item hierarchy based on the FLAT openUrl
  var item = helper.flattenedMapToItem('citation', true, map);
  LOGGER.log('debug', 'item before specialization: ' + JSON.stringify(item));

  // Capture all of the unmappable information and pass it back in the callback for processing
  var unmappable = {};

  _.forEach(map, function(value, key){
    if(!helper.wasMapped(item, key)){
      unmappable[key] = value;
    }
  });

  callback(item, unmappable);
}

// -----------------------------------------------------------------------------------------------
Parser.prototype.parse = function(request, callback){
  var self = this;
  
  this.buildItemsFromQueryString(request.getUnmapped(), function(item, unmapped){
		request.setUnmapped(helper.mapToQueryString(unmapped));
  
    // If its OpenURL version 0.1 search the 'id' and 'pid' params for identifiers
    if(_.size(unmapped) > 0){
      if(self._version == '0.1'){
          if(unmapped['id']){
            self._parseId(item, unmapped['id'], {'pmid': 'pmid:', 
                                               	 'doi': 'doi:', 
                                               	 'issn': 'issn:', 
                                               	 'isbn': 'isbn:', 
                                               	 'lccn': 'lccn:'});
          }
    
          if(unmapped['pid']){
            self._parseId(item, unmapped['pid'], {'naxos': ['<naxos>', '</naxos>', '%3Cnaxos%3E', '%3C%2Fnaxos%3E']});
          }
  
      // If its OpenURL version 1.0 search the 'rft_id' and 'rfe_dat' params for identifiers
      }else if(self._version == '1.0'){
        if(unmapped['rft_id']){
          self._parseId(item, unmapped['rft_id'], {'oclc': 'info:oclcnum/:', 
                                                 	 'pmid': 'info:pmid/', 
                                                 	 'lccn': 'info:lccn/', 
                                                 	 'doi': 'info:doi/', 
                                                 	 'bibcode': 'info:bibcode/',
                                                 	 'hdl': 'info:hdl/',
                                                 	 'eric': 'info:eric/',
                                                 	 'isbn': 'urn:ISBN:',
                                                 	 'issn': 'urn:ISSN'});
        }
      
        if(unmapped['rfe_dat']){
          self._parseId(item, unmapped['rfe_dat'], {'oclc': ['<accessionnumber>', '</accessionnumber>', '%3Caccessionnumber%3E', '%3C%2Faccessionnumber%3E']});
        }
      } 
    }
  
    // Handle multiple authors
    self._handleMultipleAuthors(item);
  
    // Detect the genre if necessary
    var genre = helper.getCrossReference(item.getType(), 'genre', item.getAttribute('genre'));
    if(genre == 'unknown' || genre == '' || genre == undefined){
      item.addAttribute('genre', self._assignGenre(item));
    }
  
    request.setType('openurl-' + self._version);
    request.addReferent(item);
  
    callback(request);
  });
}

// ---------------------------------------------------------------------------------------------
module.exports = OpenUrlParser = Parser;