"use strict";

var events = require('events');
var util = require('util');
var _ = require('underscore');
var assert = require('assert');

var CONFIGS = require("../lib/config.js");


// Setup a timer to wait for the CONFIGS to get loaded before loading
// modules that depend on CONFIGS
// fs operations in config may be causing this problem?
var i = 0;
var log;
var helper;
var Broker;
var Item;
var Tier;
var Service;
var Request;
var serializer;
var TEST;
var configHelper;

var waitForConfigs = setInterval(function() {
  if (typeof CONFIGS.application !== 'undefined' || i >= 2000) {
    clearInterval(waitForConfigs);
    TEST = require("./prep.js");
    log = require('../lib/logger.js');
    helper = require("../lib/utils/helper.js");
    configHelper = require("../lib/utils/config_helper.js");
    Broker = require("../lib/broker.js");
    Item = require("../lib/models/item.js");
    Tier = require("../lib/tier.js");
    Service = require("../lib/service.js");
    Request = require("../lib/models/request.js");
    serializer = require("../lib/utils/serializer.js");
  }
  i++;
}, 200);

// ---------------------------------------------------------------------------------------------------
describe('broker.js', function() {
  this.timeout(20000);

  var Socket, _request, _results = [];

  var _oldTierProcessMethod, _oldTierHasMinimumCitationMethod, _oldTierTimeout = 1000;

  // ---------------------------------------------------------------------------------------------------
  before(function(done) {
    // Wait for the config file and initial modules have finished loading before starting up the server
    var delayStartup = setInterval(function() {
      if (typeof Item !== 'undefined') {
        clearInterval(delayStartup);

        _oldTierTimeout = CONFIGS.application.tier_timeout;

        _oldTierProcessMethod = Tier.prototype.process;
        _oldTierHasMinimumCitationMethod = Tier.prototype._hasMinimumCitation;

        CONFIGS.application.tier_timeout = 100;

        // Mock the Tier's process routine to simply send back stub messages
        // ---------------------------------------------------------------------------------------------------
        Tier.prototype.process = function(headers, item) {
          var _self = this,
                  _items;

          _.forEach(_self._queue, function(service) {
            if (item.getAttribute('title') === 'full_stack') {
              console.log(TEST.fullItemWithChildren.getAttribute('authors'));
              _items = [helper.mapToItem(TEST.rootItemType, true, TEST.fullItemWithChildren)];
            } else {
              _items = [helper.mapToItem(TEST.rootItemType, true, TEST.fullItem)];
            }

            if (service instanceof Service) {
              _self.emit('response', {'service': service.getDisplayName(), 'original': item, 'new': _items});
            }
          });

          _self.emit('message', serializer.itemToJsonForClient('Cedilla', new Item('error', false,
                  {'level': 'warning',
                    'message': CONFIGS.message.tier_unknown_item_type})));

          _self.emit('complete', 'We are done here!');
        };
        // ---------------------------------------------------------------------------------------------------
        // Override Tier level rules checks so that we don't have to worry about them being filtered out
        Tier.prototype._hasMinimumCitation = function() {
          return true;
        };

        // ---------------------------------------------------------------------------------------------------
        // Add some methods to store the services that should respond for the item so we can check them in tests
        Item.prototype.setServices = function(services) {
          this._services = services;
        };
        // ---------------------------------------------------------------------------------------------------
        Item.prototype.getServices = function() {
          return this._services;
        };

        done();
      }
    });
  });

  // ---------------------------------------------------------------------------------------------------
  after(function(done) {
    // Return the Tier and Service objects back to their original state
    Tier.prototype.process = _oldTierProcessMethod;
    Tier.prototype._hasMinimumCitation = _oldTierHasMinimumCitationMethod;

    Item.prototype.getServices = undefined;
    Item.prototype.setServices = undefined;

    CONFIGS.application.tier_timeout = _oldTierTimeout;

    done();
  });

  // ---------------------------------------------------------------------------------------------------
  beforeEach(function(done) {
    _results = [];

    // Construct a socket to mock sending messages back to the client
    Socket = function(callback) {
      var _self = this;

      // Call the constructor for EventEmitter
      events.EventEmitter.call(_self);

      _self.handshake = _self.buildHandshake();

      _self.on('complete', function() {
        callback();
      });

      _.forEach(CONFIGS.data.objects, function(def, type) {
        _self.on(type, function(json) {
          _results.push(json);
        });
      });
    };
    util.inherits(Socket, events.EventEmitter);

    Socket.prototype.buildHandshake = function() {
      return {
        headers: {},
        time: (new Date()) + '',
        address: 'http://my.domain.org',
        xdomain: !!'http://my.domain.org/origin',
        secure: !!false,
        issued: +(new Date()),
        url: 'http://my.domain.org/target'
      };
    };

    _request = new Request({'referrers': ['my.domain.org'],
      'content_type': 'text/plain',
      'ip': '127.0.0.1',
      'agent': 'Chrome',
      'language': 'en',
      'identifiers': ['jdoe@domain.org'],
      'service_api_version': '1.1',
      'client_api_version': '1.0',
      'request': 'testing - item built manually',
      'type': 'test'});

    done();
  });

  // ---------------------------------------------------------------------------------------------------
  it("should throw an error if any parameter is not defined.", function(done) {
    var _socket = new Socket(function() {
    });

    console.log('BROKER: checking errors are thrown for bad socket/item/log.');

    assert.throws(function() {
      new Broker(undefined, undefined, log);
    }, function(err) {
      assert.equal(err.message, CONFIGS.message.broker_bad_request);
      return true;
    });
    assert.throws(function() {
      new Broker(undefined, _request, log);
    }, function(err) {
      assert.equal(err.message, CONFIGS.message.broker_bad_socket);
      return true;
    });
    assert.throws(function() {
      new Broker(_socket, undefined, log);
    }, function(err) {
      assert.equal(err.message, CONFIGS.message.broker_bad_request);
      return true;
    });
    assert.throws(function() {
      new Broker(_socket, _request);
    }, function(err) {
      assert.equal(err.message, configHelper.buildMessage(CONFIGS.message.bad_param, ['log']));
      return true;
    });

    done();
  });

  // ---------------------------------------------------------------------------------------------------
  it("should return bad item errors for unknown item types or invalid items", function(done) {
    console.log('BROKER: check invalid item handling.');

    var _socket = new Socket(function() {
    });

    var _invalidItem = new Item(TEST.rootItemType, false, {'foo': 'bar'});

    _request.addReferent(_invalidItem);

    var _broker = new Broker(_socket, _request, log);

    _broker.processRequest(_request.getReferents()[0], function() {
    });

    assert.equal(_.size(_request.getErrors()), 1);
    assert.equal(_request.getErrors()[0], CONFIGS.message.broker_bad_item_message);

    done();
  });

  // ---------------------------------------------------------------------------------------------------
  it('should return a no services error', function(done) {
    var _socket = new Socket(function() {
    });

    var _gas = Broker.prototype._getAvailableServices,
            _aars = Broker.prototype._addAlwaysRunServices,
            _fsfcl = Broker.prototype._filterServicesForClientList;

    // Override the basic service construction methods
    Broker.prototype._getAvailableServices = function() {
      return [];
    };
    Broker.prototype._addAlwaysRunServices = function() {
      return [];
    };
    Broker.prototype._filterServicesForClientList = function() {
      return [];
    };

    _request.addReferent(TEST.fullItem);

    var _broker = new Broker(_socket, _request, log);

    _broker.processRequest(_request.getReferents()[0], function() {
    });

    assert.equal(1, _.size(_request.getErrors()));
    assert.equal(_request.getErrors()[0], CONFIGS.message.broker_no_services_available);

    // Set the Broker service construction methods back to their original state
    Broker.prototype._getAvailableServices = _gas;
    Broker.prototype._addAlwaysRunServices = _aars;
    Broker.prototype._filterServicesForClientList = _fsfcl;

    done();
  });

  // ---------------------------------------------------------------------------------------------------
  it("checking available service construction", function(done) {
    var _socket = new Socket(function() {
    });

    console.log('BROKER: testing available service construction for specified rules.');

    _request.addReferent(TEST.fullItem);

    var _broker = new Broker(_socket, _request, log);

    assert.equal(_.size(_broker._getAvailableServices(TEST.emptyItem)), 0);

    var _options = {},
            _service = '';

    // Get a set of valid attribute values from rules.yaml
    _.forEach(CONFIGS.rules.objects[TEST.bareMinimumItem.getType()], function(rules, attribute) {
      // This is the first attribute so grab its last value and services 
      if (_service === '') {
        _.forEach(rules, function(services, value) {
          _service = services;
          _options[attribute] = value;
        });

      } else {
        // This isn't the first item attribute so just see if it can respond to the first attribute's services
        _.forEach(rules, function(services, value) {
          if (_.contains(services, _.first(_service))) {
            _options[attribute] = value;

            // Remove any of the other services if they aren't a match for this attribute's value OR its not one
            // of the defined services (e.g. its not enabled in the config)
            _.forEach(_service, function(svc) {
              if (!_.contains(services, svc) || !_.contains(TEST.allServices, svc)) {
                _service.splice(_service.indexOf(svc), 1);
              }
            });
          }
        });
      }
    });

    var _params = TEST.bareMinimumItem.getAttributes(),
            _item = new Item(TEST.bareMinimumItem.getType(), false, _params);


    _.forEach(_options, function(value, attribute) {
      _item.addAttribute(attribute, value);
    });

    assert.equal(_.size(_broker._getAvailableServices(_item)), _.size(_service));

    done();
  });

  // ---------------------------------------------------------------------------------------------------
  it("checking allocation of dispatch_always services", function(done) {
    var _socket = new Socket(function() {
    });

    console.log('BROKER: testing allocation of dispatch_always designated services.');

    _request.addReferent(TEST.fullItem);

    var _broker = new Broker(_socket, _request, log),
            _services = _broker._getAvailableServices(TEST.emptyItem);

    assert.equal(_.size(_broker._addAlwaysRunServices(_services)), TEST.dispatchAlwaysServiceCount);

    done();
  });

  // ---------------------------------------------------------------------------------------------------
  it("_filterServicesForClientList", function(done) {
    // This feature has not yet been implemented

    done();
  });

  // ---------------------------------------------------------------------------------------------------
  it("checking that service referer blocks are working", function(done) {
    var _socket = new Socket(function() {
    });

    console.log('BROKER: testing removal of services that call back out to the referer.');

    _request.addReferent(TEST.fullItem);

    var _broker = new Broker(_socket, _request, log),
            _blocks = {},
            _services = _broker._getAvailableServices(TEST.emptyItem),
            _item = new Item(TEST.bareMinimumItem.getType(), false, TEST.bareMinimumItem.getAttributes());

    _.forEach(TEST.tierServices, function(services, tier) {
      _.forEach(services, function(service) {
        if (CONFIGS.services.tiers[tier][service].do_not_call_if_referrer_from) {
          _blocks[service] = CONFIGS.services.tiers[tier][service].do_not_call_if_referrer_from;
        }
      });
    });

    // Get a set of valid attribute values for the service!
    _.forEach(_blocks, function(domains, service) {
      if (!_.contains(TEST.dispatchAlwaysServices, service)) {
        _.forEach(CONFIGS.rules.objects[TEST.bareMinimumItem.getType()], function(rules, attribute) {
          _.forEach(rules, function(services, value) {
            if (_.contains(services, service)) {
              _item.addAttribute(attribute, value);
            }
          });
        });
      }

      _.forEach(domains, function(domain) {
        assert(_broker._removeServiceForReferer(TEST.getTierNameForService(service), service, [domain]));
        assert(!_broker._removeServiceForReferer(TEST.getTierNameForService(service), service, ['blah.edu']));
      });
    });



    assert.equal(_.size(_broker._addAlwaysRunServices(_services)), TEST.dispatchAlwaysServiceCount);
    done();
  });

  // ---------------------------------------------------------------------------------------------------
  it("checking tier preparation", function(done) {
    var _socket = new Socket(function() {
    });

    console.log('BROKER: testing assignment of services to their appropriate tier.');

    _request.addReferent(TEST.fullItem);

    var _broker = new Broker(_socket, _request, log),
            _services = [];

    _.forEach(TEST.allServices, function(name) {
      _services.push(new Service(name, log));
    });

    _broker._prepareTiers(_services, _request.getReferrers());

    _.forEach(_broker._tiers, function(tier) {
      _.forEach(tier._queue, function(service) {
        assert(_.contains(TEST.tierServices[tier.getName()], service.getName()));
      });
    });

    done();
  });

  // ---------------------------------------------------------------------------------------------------
  it("checking processing of responses from tiers", function(done) {
    console.log('BROKER: testing handling of tier responses.');

    var _processed = false;

    var interval = setInterval(function() {
      // Make sure each tier completes
      if (_processed) {
        clearInterval(interval);
        done();
      }
    }, 100);

    var _socket = new Socket(function() {
      // Make sure all of the results are in the client JSON format
      _.forEach(_results, function(result) {
        if (result.indexOf('"error":') >= 0) {
          assert(result.indexOf(CONFIGS.message.tier_unknown_item_type) >= 0);

        } else {
          assert(result.indexOf('"time":') >= 0);
          assert(result.indexOf('"api_ver":') >= 0);
          assert(result.indexOf('"service":') >= 0);
          assert(result.indexOf('"' + TEST.rootItemType + '":') >= 0);
        }
      });
      _processed = true;
    });

    _request.addReferent(TEST.bareMinimumItem);

    var _broker = new Broker(_socket, _request, log);

    _broker.processRequest(_request.getReferents()[0], function() {
    });
  });

  // ---------------------------------------------------------------------------------------------------
  it("checking messaging to client", function(done) {
    console.log('BROKER: testing item to JSON for client serialization.');

    var _processed = false;

    var interval = setInterval(function() {
      // Make sure each tier completes
      if (_processed) {//} >= _total){
        _.forEach(_results, function(result) {
          var json = JSON.parse(result),
                  svc = new Service(TEST.serviceDisplayNameToName(json.service), log);

          _.forEach(CONFIGS.data.objects, function(def, type) {
            if (json[type]) {
              assert(svc.returnsItemType(type));
            }
          });
        });

        clearInterval(interval);
        done();
      }
    }, 100);

    var _socket = new Socket(function() {
    });

    _request.addReferent(TEST.bareMinimumItem);

    var _broker = new Broker(_socket, _request, log);
    var _item = new Item(TEST.fullItemWithChildren.getType(), false, TEST.fullItemWithChildren.getAttributes());

    var i = 0,
            services = [];

    _.forEach(TEST.tierServices, function(svcs) {
      if (i === 0) {
        _.forEach(svcs, function(svc) {
          services.push(new Service(svc, log));
        });
      }
      i++;
    });

    _broker._services = services;

    _results = [];
    //_total = _.size(_broker._services);

    _.forEach(_broker._services, function(service) {
      _broker._sendItemToClient(service.getDisplayName(), _item);
      _processed = true;//++;
    });

  });

});
