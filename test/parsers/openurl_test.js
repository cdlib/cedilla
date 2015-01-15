"use strict";

var _ = require('underscore');
var assert = require('assert');

var CONFIGS = require("../../lib/config.js");

// Setup a timer to wait for the CONFIGS to get loaded before loading
// modules that depend on CONFIGS
// fs operations in config may be causing this problem?
var i = 0;
var OpenUrlParser;
var Request;
var Item;


var waitForConfigs = setInterval(function() {
  if (typeof CONFIGS.application !== 'undefined' || i >= 2000) {
    clearInterval(waitForConfigs);
    OpenUrlParser = require("../../lib/parsers/openurl.js");
    Request = require("../../lib/models/request.js");
    Item = require("../../lib/models/item.js");
  }
  i++;
}, 200);

// -------------------------------------------------------------------------------------------
describe('OpenUrlParser', function() {
  
  var request;
  
  describe('#openurl()', function() {

    before(function(done) {
      // Wait for the config file and initial modules have finished loading before starting up the server
      var delayStartup = setInterval(function() {
        if (typeof Item !== 'undefined') {
          clearInterval(delayStartup);

          done();
        }
      });
    });

    beforeEach(function(done) {
      request = new Request({
        'content_type': 'text/html',
        'language': 'en',
        'service_api_version': CONFIGS.application.service_api_version,
        'client_api_version': CONFIGS.application.client_api_version});
      done();
    });

    // -------------------------------------------------------------------------------------------
    it('should correctly identify the openurl version', function() {
      console.log("PARSER: Checking that parser correctly identifies openurl 1.0");
      var query = "url_ver=Z39.88-2004&url_ctx_fmt=info:ofi/fmt:kev:mtx:ctx&rft_val_fmt=info:ofi/fmt:kev:mtx:journal&rft.atitle=The impact of forest use and reforestation on soil hydraulic conductivity in the Western Ghats of India: Implications for surface and sub-surface hydrology&rft.aufirst=M.&rft.aulast=Bonell&rft.date=2010&rft.epage=64&rft.genre=article&rft.issn=0022-1694&rft.issue=1-2&rft.jtitle=JOURNAL OF HYDROLOGY&rft.pages=49-64&rft.spage=49&rft.stitle=J HYDROL&rft.volume=391&rfr_id=info:sid/www.isinet.com:WoK:UA&rft.au=Purandara, B. K.&rft.au=Venkatesh, B.&rft.au=Krishnaswamy, Jagdish&rft.au=Acharya, H. A. K.&rft_id=info:doi/10.1016/j.jhydrol.2010.07.004";

      var parser = new OpenUrlParser(query);
      assert.equal('openurl_1_0', parser.getVersion());
    });

    // -------------------------------------------------------------------------------------------
    it('should identify the openurl version without url_ver field', function() {
      console.log("PARSER: Checking the parser correctly identifies openurl 1.0 when url_ver field is missing.");
      var query = "url_ctx_fmt=info:ofi/fmt:kev:mtx:ctx&rft_val_fmt=info:ofi/fmt:kev:mtx:journal&rft.atitle=The impact of forest use and reforestation on soil hydraulic conductivity in the Western Ghats of India: Implications for surface and sub-surface hydrology&rft.aufirst=M.&rft.aulast=Bonell&rft.date=2010&rft.epage=64&rft.genre=article&rft.issn=0022-1694&rft.issue=1-2&rft.jtitle=JOURNAL OF HYDROLOGY&rft.pages=49-64&rft.spage=49&rft.stitle=J HYDROL&rft.volume=391&rfr_id=info:sid/www.isinet.com:WoK:UA&rft.au=Purandara, B. K.&rft.au=Venkatesh, B.&rft.au=Krishnaswamy, Jagdish&rft.au=Acharya, H. A. K.&rft_id=info:doi/10.1016/j.jhydrol.2010.07.004";

      var parser = new OpenUrlParser(query);
      assert.equal('openurl_1_0', parser.getVersion());
    });

    // -------------------------------------------------------------------------------------------
    it('should derive the oclc number from the rfe_dat field', function(done) {
      console.log("PARSER: Checking the parser derives oclc number from rfe_dat field");
      var query = "url_ctx_fmt=info:ofi/fmt:kev:mtx:ctx&rfe_dat=<accessionnumber>12345</accessionnumber>&rft_val_fmt=info:ofi/fmt:kev:mtx:journal&rft.atitle=The impact of forest use and reforestation on soil hydraulic conductivity in the Western Ghats of India: Implications for surface and sub-surface hydrology&rft.aufirst=M.&rft.aulast=Bonell&rft.date=2010&rft.epage=64&rft.genre=article&rft.issn=0022-1694&rft.issue=1-2&rft.jtitle=JOURNAL OF HYDROLOGY&rft.pages=49-64&rft.spage=49&rft.stitle=J HYDROL&rft.volume=391&rfr_id=info:sid/www.isinet.com:WoK:UA&rft.au=Purandara, B. K.&rft.au=Venkatesh, B.&rft.au=Krishnaswamy, Jagdish&rft.au=Acharya, H. A. K.&rft_id=info:doi/10.1016/j.jhydrol.2010.07.004";

      var parser = new OpenUrlParser(query);
      assert.equal('openurl_1_0', parser.getVersion());

      request.setRequest(query);
      request.setUnmapped(query);

      parser.parse(request, function(req) {
        var item = req.getReferents()[0];
        assert.equal(item.getAttribute('oclc'), '12345');
        assert.equal(item.getAttribute('issn'), '0022-1694');

        done();
      });
    });

    // -------------------------------------------------------------------------------------------
    it('should derive the naxos id from the pid field', function(done) {
      console.log("PARSER: Checking the parser derives naxos id from pid field");
      var query = "req.ip=169.229.0.98&sid=SCP:SCP&genre=article&pid=<naxos>EUCD2045</naxos>";

      var parser = new OpenUrlParser(query);
      assert.equal('openurl_0_1', parser.getVersion());

      request.setRequest(query);
      request.setUnmapped(query);

      parser.parse(request, function(req) {
        var item = req.getReferents()[0];
        assert.equal(item.getAttribute('naxos'), 'EUCD2045');

        done();
      });
    });

    // -------------------------------------------------------------------------------------------
    it('should derive the oclc number, isbn, and pmid from the rft_id field', function(done) {
      console.log("PARSER: Checking that parser derives oclc number, pmid and isbn from rft_id field");
      var query = "url_ctx_fmt=info:ofi/fmt:kev:mtx:ctx&rft_id=info:oclcnum/12345&rft_id=urn:ISBN:12345&rft_id=info:pmid/56789&rft_val_fmt=info:ofi/fmt:kev:mtx:journal&rft.atitle=The impact of forest use and reforestation on soil hydraulic conductivity in the Western Ghats of India: Implications for surface and sub-surface hydrology&rft.aufirst=M.&rft.aulast=Bonell&rft.date=2010&rft.epage=64&rft.genre=article&rft.issn=0022-1694&rft.issue=1-2&rft.jtitle=JOURNAL OF HYDROLOGY&rft.pages=49-64&rft.spage=49&rft.stitle=J HYDROL&rft.volume=391&rfr_id=info:sid/www.isinet.com:WoK:UA&rft.au=Purandara, B. K.&rft.au=Venkatesh, B.&rft.au=Krishnaswamy, Jagdish&rft.au=Acharya, H. A. K.&rft_id=info:doi/10.1016/j.jhydrol.2010.07.004";

      var parser = new OpenUrlParser(query);
      assert.equal('openurl_1_0', parser.getVersion());

      request.setRequest(query);
      request.setUnmapped(query);

      parser.parse(request, function(req) {
        var item = req.getReferents()[0];
        assert.equal(item.getAttribute('oclc'), '12345');
        assert.equal(item.getAttribute('isbn'), '12345');
        assert.equal(item.getAttribute('pmid'), '56789');

        done();
      });
    });

    // -------------------------------------------------------------------------------------------
    it('should identify openurl 0.1', function() {
      console.log("PARSER: Checking that parser identifies openurl 0.1 version");
      var query = "sid=UCLinks-google&volume=8&aulast=Ellison&month=09&atitle=Mangrove Restoration: Do We Know Enough?&spage=219&issn=1061-2971&issue=3&genre=article&auinit=A M&aufirst=Aaron&epage=229&title=Restoration ecology&year=2000&date=2000-09&pid=institute=UCB&placeOfPublication=Cambridge%2c+Mass.&publisher=Blackwell+Scientific+Publications";

      var parser = new OpenUrlParser(query);
      assert.equal('openurl_0_1', parser.getVersion());
    });

    // -------------------------------------------------------------------------------------------
    it('should derive the pid values from an openurl 0.1', function(done) {
      console.log("PARSER: Checking that the pid values are derived from an openurl 0.1 id field");
      var query = "id=pmid:19889244&id=lccn:56789&sid=UCLinks-Entrez:PubMed&aulast=Spadafranca&month=11&atitle=Effect of dark chocolate on plasma epicatechin levels, DNA resistance to oxidative stress and total antioxidant activity in healthy subjects.&spage=1&issn=0007-1145&genre=article&auinit=A&epage=7&title=The British Journal of Nutrition&year=2009&pid=institute%3DUCOP%26placeOfPublication%3DWallingford%252C%2BOxfordshire%26publisher%3DCABI%2BPub";

      var parser = new OpenUrlParser(query);
      assert.equal('openurl_0_1', parser.getVersion());

      request.setRequest(query);
      request.setUnmapped(query);

      parser.parse(request, function(req) {
        var item = req.getReferents()[0];
        assert.equal(item.getAttribute('pmid'), '19889244');
        assert.equal(item.getAttribute('lccn'), '56789');
        assert.equal(item.getAttribute('institute', 'UCOP'));
        assert.equal(item.getAttribute('publication_place'), 'Wallingford%2C+Oxfordshire');
        assert.equal(item.getAttribute('publisher'), 'CABI+Pub');

        done();
      });
    });

    // -------------------------------------------------------------------------------------------
    it('should properly interpret multiple authors', function() {
      console.log("PARSER: Verifying multiple authors are properly handled");

      // Empty authors (should result in no authors)
      var tests = {'rft.genre&rft.au=&rft.title=Testing': 0,
        'rft.genre&rft.aufirst=&rft.aulast=&rft.title=Testing': 0,
        'rft.genre&rft.au=&rft.aufirst=&rft.aulast=&rft.title=Testing': 0,
        'rft.genre&rft.title=Testing&rft.au=John%20Doe': 1,
        'rft.genre&rft.title=Testing&rft.aufirst=John&rft.aulast=Doe': 1,
        'rft.genre&rft.title=Testing&rft.aufirst=John&rft.aulast=Doe&rft.au=John%20Doe': 1,
        'rft.genre&rft.title=Testing&rft.au=John%20Doe&rft.au=Bobba%20Fett': 2,
        'rft.genre&rft.title=Testing&rft.aufirst=John&rft.aulast=Doe&rft.aufirst=Bobba&rft.aulast=Fett': 1,
        'rft.genre&rft.title=Testing&rft.au=John%20Doe&rft.aufirst=Bobba&rft.aulast=Fett&rft.au=John%20Smith': 3
      };

      _.forEach(tests, function(responses, query) {
        var parser = new OpenUrlParser(query);
        var req = new Request({});

        req.setRequest(query);
        req.setUnmapped(query);

        parser.parse(req, function(r) {
          var item = r.getReferents()[0];

          assert.equal(item.getAttribute('authors').length, responses);
        });
      });
    });

    // -------------------------------------------------------------------------------------------
    it('should correctly auto-detect genre', function() {
      console.log("PARSER: Checking genre auto-correct functionality for unknown genres");

      // ---------------------------------------------------------------------
      // IDENTIFIER PRESENT for JOURNAL/ISSUE/ARTICLE
      // ---------------------------------------------------------------------
      _.forEach(['unknown', '', undefined], function(genre) {
        _.forEach(['issn', 'eissn', 'coden', 'eric', 'sici'], function(identifier) {
          // Article title present (ARTICLE)
          var query = (genre !== undefined ? 'rft.genre=' + genre : '') + "&rft.atitle=Article%20Title&rft." + identifier + '=123';
          sendRequest(query, 'genre', function(value) {
            assert.equal(value, 'article');
          });

          _.forEach(['issue', 'volume', 'season', 'quarter'], function(issueId) {
            // No article title but issue identifiers (ISSUE)
            query = (genre !== undefined ? 'rft.genre=' + genre : '') + "&rft." + identifier + "=12345&rft.au=John%20Doe&rft." + issueId + "=ABCD:" + identifier;
            sendRequest(query, 'genre', function(value) {
              assert.equal(value, 'issue');
            });
          });

          // No article title and no issue identifiers (JOURNAL)
          query = (genre !== undefined ? 'rft.genre=' + genre : '') + "&rft." + identifier + "=12345&rft.au=John%20Doe";
          sendRequest(query, 'genre', function(value) {
            assert.equal(value, 'journal');
          });

        });
      });




      // ---------------------------------------------------------------------
      // IDENTIFIER PRESENT for BOOK/BOOKITEM
      // ---------------------------------------------------------------------
      _.forEach(['isbn', 'eisbn', 'bici'], function(identifier) {
        _.forEach(['unknown', '', undefined], function(genre) {
          // Chapter title is present (BOOKITEM)
          var query = (genre !== undefined ? 'rft.genre=' + genre : '') + "&rft.atitle=Chapter%20Title&rft." + identifier + "=12345&rft.au=John%20Doe";
          sendRequest(query, 'genre', function(value) {
            assert.equal(value, 'bookitem');
          });

          // No chapter title (BOOK)
          query = (genre !== undefined ? 'rft.genre=' + genre : '') + "&rft." + identifier + "=12345&rft.au=John%20Doe";
          sendRequest(query, 'genre', function(value) {
            assert.equal(value, 'book');
          });

        });
      });

      // ---------------------------------------------------------------------
      // DISSERTATION ID PRESENT
      // ---------------------------------------------------------------------
      _.forEach(['unknown', '', undefined], function(genre) {
        var query = (genre !== undefined ? 'rft.genre=' + genre : '') + "&rft.dissertationNumber=ABC123";
        sendRequest(query, 'genre', function(value) {
          assert.equal(value, 'dissertation');
        });
      });

      // ---------------------------------------------------------------------
      // TITLES ONLY
      // ---------------------------------------------------------------------
      _.forEach(['unknown', '', undefined], function(genre) {
        // article alone
        var query = (genre !== undefined ? 'rft.genre=' + genre : '') + "&rft.atitle=Article%20Title&rft.au=John%20Doe";
        sendRequest(query, 'genre', function(value) {
          assert.equal(value, 'article');
        });

        // journal alone
        query = (genre !== undefined ? 'rft.genre=' + genre : '') + "&rft.jtitle=Journal%20Title&rft.au=John%20Doe";
        sendRequest(query, 'genre', function(value) {
          assert.equal(value, 'journal');
        });

        // book alone
        query = (genre !== undefined ? 'rft.genre=' + genre : '') + "&rft.btitle=Book%20Title&rft.au=John%20Doe";
        sendRequest(query, 'genre', function(value) {
          assert.equal(value, 'book');
        });

        // title alone
        query = (genre !== undefined ? 'rft.genre=' + genre : '') + "&rft.title=Article%20Title&rft.au=John%20Doe";
        sendRequest(query, 'genre', function(value) {
          assert.equal(value, 'article');
        });

        // article and title available
        query = (genre !== undefined ? 'rft.genre=' + genre : '') + "&rft.title=Journal%20Title&rft.atitle=Article%20Title&rft.au=John%20Doe";
        sendRequest(query, 'genre', function(value) {
          assert.equal(value, 'article');
        });

        // journal and title available
        query = (genre !== undefined ? 'rft.genre=' + genre : '') + "&rft.title=Title&rft.jtitle=Journal%20Title&rft.au=John%20Doe";
        sendRequest(query, 'genre', function(value) {
          assert.equal(value, 'journal');
        });

        // book and title available
        query = (genre !== undefined ? 'rft.genre=' + genre : '') + "&rft.title=Journal%20Title&rft.btitle=Book%20Title&rft.au=John%20Doe";
        sendRequest(query, 'genre', function(value) {
          assert.equal(value, 'book');
        });

        // article and journal available
        query = (genre !== undefined ? 'rft.genre=' + genre : '') + "&rft.jtitle=Journal%20Title&rft.atitle=Article%20Title&rft.au=John%20Doe";
        sendRequest(query, 'genre', function(value) {
          assert.equal(value, 'article');
        });

        // article, journal, and title available
        query = (genre !== undefined ? 'rft.genre=' + genre : '') + "&rft.title=Title&rft.jtitle=Journal%20Title&rft.atitle=Article%20Title&rft.au=John%20Doe";
        sendRequest(query, 'genre', function(value) {
          assert.equal(value, 'article');
        });

        // chapter and book available
        query = (genre !== undefined ? 'rft.genre=' + genre : '') + "&rft.btitle=Book%20Title&rft.atitle=Chapter%20Title&rft.au=John%20Doe";
        sendRequest(query, 'genre', function(value) {
          assert.equal(value, 'bookitem');
        });

      });
    });

  });
});

// ------------------------------------------------------------
function sendRequest(query, attribute, callback) {
  var parser = new OpenUrlParser(query);
  var req = new Request({});

  req.setRequest(query);
  req.setUnmapped(query);

  parser.parse(req, function(r) {
    var item = r.getReferents()[0];

    callback(item.getAttribute(attribute));
  });
}
