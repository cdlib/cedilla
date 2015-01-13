"use strict";

var _ = require('underscore');
var assert = require('assert');

var CONFIGS = require("../lib/config.js");

// Setup a timer to wait for the CONFIGS to get loaded before loading
// modules that depend on CONFIGS
// fs operations in config may be causing this problem?
var i = 0;
var helper;
var Item;
var Service;

var waitForConfigs = setInterval(function() {
  if (typeof CONFIGS.application !== 'undefined' || i >= 2000) {
    clearInterval(waitForConfigs);
    helper = require("../lib/utils/helper.js");
    Item = require("../lib/models/item.js");
    Service = require("../lib/service.js");
  }
  i++;
}, 200);

describe('server.js testing', function() {
  this.timeout(20000);

  var item,
          oldServiceCallMethod,
          os = require('os');

  // ----------------------------------------------------------------------------------------
  before(function(done) {
    // Wait for the config file and all modules have finished loading before starting up the server
    var delayStartup = setInterval(function() {
      if (typeof Item !== 'undefined') {
        clearInterval(delayStartup);

        _.forEach(CONFIGS.data.objects, function(def, type) {
          if (def.root) {
            var params = {};

            _.forEach(def.attributes, function(attribute) {
              params[attribute] = 'foo-bar';
            });

            item = new Item(type, true, params);
          }
        });

        var server = require('../lib/server.js');

        // Bind to the port specified in the config/application.yaml or the default 3000
        // ----------------------------------------------------------------------------------------------
        server.listen((CONFIGS.application.port || 3000), function() {
          var msg = CONFIGS.application.application_name + ' is now monitoring port ' + CONFIGS.application.port;

          console.log(msg);

          // Capture the original Service.call so that we can set it back after its been overriden
          oldServiceCallMethod = Service.prototype.call;

          // Override the actual service call and return a stub item
          Service.prototype.call = function(item) {
            var map = {},
                    type = item.getType();

            if (typeof CONFIGS.data.objects[type] !== 'undefined') {
              _.forEach(CONFIGS.data.objects[type].attributes, function(attribute) {
                map[attribute] = 'foo';
              });

              _.forEach(CONFIGS.data.objects[type].children, function(child) {
                var param = {};
                param[CONFIGS.data.objects[child].attributes[0]] = 'yadda';

                map[child + 's'] = [new Item(child, true, param)];
              });
            }

            this.emit('response', [helper.mapToItem(type, false, map)]);
          };

          done();
        });

      }
    });
  });

  // ----------------------------------------------------------------------------------------
  after(function() {
    Service.prototype.call = oldServiceCallMethod;
  });

  // ----------------------------------------------------------------------------------------
  it('should establish a socket.io connection', function(done) {
    var io = require('socket.io-client'),
            options = {transports: ['websocket'], 'force new connection': true};

    console.log('SERVER: should establish a socket.io connection and return at least one item type (except error)');

    // -----------------------------------
    var client = io.connect('http://' + os.hostname() + ':' + CONFIGS.application.port + '/', options),
            message = false, error = false;

    client.on('connect_error', function(err) {
      console.log('err: ' + err);
    });
    client.on('reconnect_error', function(err) {
      console.log('reconnect err: ' + err);
    });
    client.on('connect_timeout', function() {
      console.log('timed out!');
    });

    client.on('connect', function() {
      client.emit('openurl', 'rft.isbn=9780300177619&rft.genre=book');

      client.on('citation', function() {
        message = true;
      });
      client.on('author', function() {
        message = true;
      });
      client.on('resource', function() {
        message = true;
      });

      client.on('error', function() {
        error = true;
      });

      client.on('complete', function() {
        assert(message);
        assert(!error);

        client.disconnect();
        done();
      });
    });

  });

});

// ----------------------------------------------------------------------------------------
// not in use
var sendRequest = function(target, payload, callback) { //jshint ignore:line
  var _http = require('http'),
          _options = {hostname: target.hostname,
            port: target.port,
            path: target.path,
            method: 'GET',
            headers: {'Content-Type': 'text/json; charset="utf-8"',
              'Content-Length': Buffer.byteLength(payload),
              'Accept': 'text/json',
              'Accept-Charset': 'utf-8',
              'Cache-Control': 'no-cache'}};
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

    _request.write(payload);
    _request.end();

  } catch (Error) {
    console.log('Error connecting to server: ' + Error);
  }

};
