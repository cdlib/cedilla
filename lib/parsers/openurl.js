/*
 * The OpenURL parser performs specialized functions to derive information from and 
 * set attributes in an item that cannot be derived and set by simple mapping. 
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
  this._version = '';
  var self = this;

  // Detect the version of the openurl
  _.forEach(CONFIGS['parsers']['openurl']['version_identifiers'], function(terms, version) {
    if (self._version === '' && _.find(terms, function(term) {
      term === 'default';
    })) {
      self._version = version;

    } else {
      _.forEach(terms, function(term) {
        if (self._version === '' && term === 'default') {
          self._version = version;

        } else if (self._openurl.indexOf(term) >= 0) {
          self._version = version;
        }
      });
    }
  });

  // ---------------------------------------------------------------------------------------------
  // Look for ids in the specified value
  // ---------------------------------------------------------------------------------------------
  this._parseIds = function(item, unmapped) {
    var config = CONFIGS['parsers']['openurl']['identifier_search'][this._version];

    // For each openurl field defined in the config
    _.forEach(config, function(mapping, param) {
      if (unmapped[param]) {
        var values = unmapped[param].toString().replace('[', '').replace(']', '').split(',');

        // If the item wasn't delimited by a comma, try an ampersand
        if (_.size(values) === 1 && values[0].indexOf('&') > 0) {
          var values = values[0].split('&');
        }

        // For each value found in the openurl field
        _.forEach(values, function(value) {
          // Check each regex against the value 
          _.forEach(mapping, function(regexs, attribute) {
            _.forEach(regexs, function(regex) {
              var val = new RegExp(regex, 'i').exec(value);
              if (val) {
                item.addAttribute(attribute, val[1]);
              }
            });
          });
        });
      }
    });
  };

  // ---------------------------------------------------------------------------------------------
  // Cleans up multiple authors that came through in the openUrl 
  // ---------------------------------------------------------------------------------------------
  this._handleMultipleAuthors = function(item) {
    var primaryAuthor = undefined;
    var auths = [];

    // The Helper class' flattenedMapToItem method will store all incoming author full names (rft.au) as an array
    _.forEach(item.getAttribute('authors'), function(author) {
      var fulls = author.getAttribute('full_name');

      // If a last_name and full_name were provided (rft.aufirst, rft.aulast) then that author is the primary author!
      if (primaryAuthor === undefined && author.getAttribute('last_name')) {
        primaryAuthor = author.getAttribute('last_name');

        author.removeAttribute('full_name');
        author.addAttribute('full_name', author.getAttribute('first_name') + ' ' + primaryAuthor);
        auths.push(author);
      }

      if (fulls instanceof Array) {
        _.forEach(fulls, function(full) {
          // This author becomes the primary if none has yet been defined
          if (primaryAuthor === undefined && full.trim() !== '') {
            primaryAuthor = full;

            author.removeAttribute('full_name');
            author.addAttribute('full_name', primaryAuthor);
            auths.push(author);

          } else {
            // If the primaryAuthor is contained within this full_name then its a duplicate otherwise its a new author
            if (full.indexOf(primaryAuthor) < 0 && full.trim() !== '') {
              auths.push(new Item('author', false, {'full_name': full}));
            }
          }
        });

      } else {
        if (fulls !== undefined) {
          // This author becomes the primary if none has yet been defined
          if (primaryAuthor === undefined && fulls.trim() !== '') {
            primaryAuthor = fulls;
            auths.push(author);

          } else {
            // If the primaryAuthor is contained within this full_name then its a duplicate otherwise its a new author
            if (fulls.indexOf(primaryAuthor) < 0 && fulls.trim() !== '') {
              author.removeAttribute('full_name');
              auths.push(new Item('author', false, {'full_name': fulls}));
            }
          }
        }
      }
    });

    if (_.size(auths) > 0) {
      item.removeAttribute('authors');
      item.addAttribute('authors', auths);
    }
  };

  // ---------------------------------------------------------------------------------------------
  // Attempt to auto-correct/detect the incoming genre and title
  // ---------------------------------------------------------------------------------------------
  this._assignGenre = function(item) {
    var newGenre = 'article';

    // Examine the available identifiers first to see if they can tell us the genre
    if (item.getAttribute('issn') || item.getAttribute('eissn') || item.getAttribute('coden') || item.getAttribute('sici') || item.getAttribute('eric')) {

      if (typeof item.getAttribute('article_title') === 'undefined' || item.getAttribute('article_title') === '') {
        // If there are specific issue identifiers, the gerne should be issue otherwise journal
        if (item.getAttribute('issue') || item.getAttribute('volume') || item.getAttribute('season') || item.getAttribute('quarter')) {
          newGenre = 'issue';
        } else {
          newGenre = 'journal';
        }

      } else {
        newGenre = 'article';
      }

    } else if (item.getAttribute('isbn') || item.getAttribute('eisbn') || item.getAttribute('bici')) {
      // If a chapter title is present then the genre is bookitem
      if (item.getAttribute('chapter_title') || item.getAttribute('article_title')) {
        newGenre = 'bookitem';
      } else {
        newGenre = 'book';
      }

    } else if (item.getAttribute('dissertation_number') !== undefined && item.getAttribute('dissertation_number') !== '') {
      newGenre = 'dissertation';

    } else {
      // We only have titles!
      // If an article title and a book title exist the item is a bookitem/chapter
      if (item.getAttribute('article_title') && item.getAttribute('book_title')) {
        newGenre = 'bookitem';

        // If book title title is present its a journal
      } else if (item.getAttribute('book_title')) {
        newGenre = 'book';

      } else if (!item.getAttribute('article_title')) {
        // If we have a journal title see if we have any issue identifiers
        if (item.getAttribute('journal_title') && (item.getAttribute('issue') || item.getAttribute('volume') || item.getAttribute('season') || item.getAttribute('quarter'))) {
          newGenre = 'issue';

          // If journal title is present its a journal
        } else if (item.getAttribute('journal_title')) {
          newGenre = 'journal';
        }
      }
    }
    item.addAttribute('genre', newGenre);
  };
};

// -----------------------------------------------------------------------------------------------
util.inherits(Parser, events.EventEmitter);

// -----------------------------------------------------------------------------------------------
Parser.prototype.getVersion = function() {
  return this._version;
};
// -----------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// Construct the initial items from the incoming openUrl
// ---------------------------------------------------------------------------------------------
Parser.prototype.buildItemsFromQueryString = function(queryString, callback) {
  var qs = helper.queryStringToMap(queryString);

  // Toss any parameters that had a blank value!
  _.forEach(qs, function(v, k) {
    if (v === '') {
      delete qs[k];
    }
  });

  var translator = new Translator('openurl');

  // Translate the openUrl keys to ones usable by our items
  var map = translator.translateMap(qs, false);

  // Create an item hierarchy based on the FLAT openUrl
  var item = helper.flattenedMapToItem('citation', true, map);

  // Capture all of the unmappable information and pass it back in the callback for processing
  var unmappable = {};

  _.forEach(map, function(value, key) {
    if (!helper.wasMapped(item, key)) {
      unmappable[key] = value;
    }
  });

  this._parseIds(item, unmappable);

  // Handle multiple authors
  this._handleMultipleAuthors(item);

  // Detect the genre if necessary
  var genre = helper.getCrossReference(item.getType(), 'genre', item.getAttribute('genre'));
  if (genre === 'unknown' || genre === '' || genre === undefined) {
    this._assignGenre(item);
  }

  callback(item, unmappable);
};

// -----------------------------------------------------------------------------------------------
Parser.prototype.parse = function(request, callback) {
  var self = this;

  this.buildItemsFromQueryString(request.getUnmapped(), function(item, unmapped) {
    request.setUnmapped(helper.mapToQueryString(unmapped));

    request.setType(self._version);
    request.addReferent(item);

    callback(request);
  });
};

// ---------------------------------------------------------------------------------------------
module.exports = OpenUrlParser = Parser;
