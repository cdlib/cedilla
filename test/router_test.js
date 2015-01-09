require('../lib');
require("./prep.js");

describe('router.js testing', function() {
  this.timeout(20000);

  // ----------------------------------------------------------------------------------------
  before(function(done) {
    // Wait for the config file and all modules have finished loading before starting up the server
    var delayStartup = setInterval(function() {
      if (typeof Item !== 'undefined') {
        clearInterval(delayStartup);

        var server = require('../lib/server.js');

        // Bind to the port specified in the config/application.yaml or the default 3000
        // ----------------------------------------------------------------------------------------------
        server.listen((CONFIGS.application.port || 3000), function() {
          var msg = CONFIGS.application.application_name + ' is now monitoring port ' + CONFIGS.application.port;

          console.log(msg);
          done();
        });
      }
    }, 500);
  });

  // ----------------------------------------------------------------------------------------
  it('should return the index.ejs', function(done) {
    var target = 'http://localhost:' + CONFIGS.application.port + '/';

    console.log('ROUTER: should return the index.ejs from ' + target);

    sendRequest(url.parse(target), {}, function(status, headers, body) {
      assert.equal(status, 200);
      assert(body.indexOf('Test an OpenUrl') >= 0);

      done();
    });
  });

  // ----------------------------------------------------------------------------------------
  it('should call the citation echo service', function(done) {
    // This one gets a decent test of the OpenURL conversion as well
    var qs = helper.mapToQueryString(helper.itemToMap(fullItem)),
            target = 'http://localhost:' + CONFIGS.application.port + '/citation?' + qs;

    console.log('ROUTER: should properly echo back the openURL as a citation item (as JSON)');

    var headers = {'Accept': 'text/json', 'Accept-Charset': 'utf-8'};

    sendRequest(url.parse(target), headers, function(status, headers, body) {
      assert.equal(status, 200);
      assert.equal('application/json', headers['content-type']);

      var json = JSON.parse(body),
              config = CONFIGS.data.objects[fullItem.getType()].attributes;

      _.forEach(config, function(attribute) {
        if (attribute === 'original_citation') {
          assert.equal(qs, json.original_citation);

        } else {
          assert.equal('foo-bar', json[attribute]);
        }
      });

      done();
    });
  });

});

// ----------------------------------------------------------------------------------------
var sendRequest = function(target, headers, callback) {
  var _http = require('http'),
          _options = {hostname: target.hostname,
            port: target.port,
            path: target.path,
            method: 'GET'};

  if (_.size(headers) > 0) {
    _options.headers = headers;
  }

  try {
    var _request = _http.request(_options, function(response) {
      var _data = '';

      response.on('data', function(chunk) {
        _data += chunk;
      });

      // ---------------------------------------------------
      response.on('end', function() {
        callback(response.statusCode, response.headers, _data);
      });
    });

    _request.on('error', function(err) {
      console.log(err.message);
      console.log(err.stack);
    });

    _request.end();

  } catch (Error) {
    console.log('Error connecting to server: ' + Error);
  }

};
