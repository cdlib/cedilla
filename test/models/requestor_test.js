"use strict";

var _ = require('underscore');
var assert = require('assert');

var Requestor = require("../../lib/models/requestor.js");

describe('request.js', function() {
  var params;

  // ------------------------------------------------------------------------------------------------------  
  before(function(done) {
    // Wait for the config file and initial modules have finished loading before starting up the server
    var delayStartup = setInterval(function() {
      if (typeof Item !== 'undefined') {
        clearInterval(delayStartup);

        params = {"affiliation": "CAMPUS-A",
          "ip": "127.0.0.1",
          "agent": "Chrome",
          "language": "en",
          "identifiers": ["ABC", "123"]};

        done();
      }
    });
  });

  // ------------------------------------------------------------------------------------------------------
  it('should assign the appropriate parameters when initialized!', function() {
    console.log('REQUESTOR: verifying object initialization.');

    // Should init properly when no params are passed in
    var requestor = new Requestor();

    assert(typeof requestor.getAffiliation() === 'undefined');
    assert(typeof requestor.getIp() === 'undefined');
    assert(typeof requestor.getLanguage() === 'undefined');
    assert(typeof requestor.getUserAgent() === 'undefined');
    assert(!requestor.hasIdentifiers());
    assert.equal(0, _.size(requestor.getIdentifiers()));

    // Should init properly when empty params are passed in
    requestor = new Requestor({});

    assert(typeof requestor.getAffiliation() === 'undefined');
    assert(typeof requestor.getIp() === 'undefined');
    assert(typeof requestor.getLanguage() === 'undefined');
    assert(typeof requestor.getUserAgent() === 'undefined');
    assert(!requestor.hasIdentifiers());
    assert.equal(0, _.size(requestor.getIdentifiers()));

    // Should init properly when a partial params is passed in
    requestor = new Requestor({"ip": "127.0.0.1"});

    assert(typeof requestor.getAffiliation() === 'undefined');
    assert.equal('127.0.0.1', requestor.getIp());
    assert(typeof requestor.getLanguage() === 'undefined');
    assert(typeof requestor.getUserAgent() === 'undefined');
    assert(!requestor.hasIdentifiers());
    assert.equal(0, _.size(requestor.getIdentifiers()));

    // Should init properly when a full params is passed in
    requestor = new Requestor(params);

    assert.equal('CAMPUS-A', requestor.getAffiliation());
    assert.equal('127.0.0.1', requestor.getIp());
    assert.equal('Chrome', requestor.getUserAgent());
    assert.equal('en', requestor.getLanguage());
    assert(requestor.hasIdentifiers());
    assert.equal(2, _.size(requestor.getIdentifiers()));
  });

  // ------------------------------------------------------------------------------------------------------
  it('should be set and get the rest of the attributes!', function() {
    console.log('REQUESTOR: verifying getters and setters.');

    var requestor = new Requestor(params);

    assert.equal('CAMPUS-A', requestor.getAffiliation());
    assert.equal('127.0.0.1', requestor.getIp());
    assert.equal('Chrome', requestor.getUserAgent());
    assert.equal('en', requestor.getLanguage());
    assert(requestor.hasIdentifiers());
    assert.equal(2, _.size(requestor.getIdentifiers()));

    requestor.setAffiliation('CAMPUS-B');
    requestor.setIp('123.123.123.123');
    requestor.setUserAgent('Mozilla Firefox');
    requestor.setLanguage('fr');

    assert.equal('CAMPUS-B', requestor.getAffiliation());
    assert.equal('123.123.123.123', requestor.getIp());
    assert.equal('Mozilla Firefox', requestor.getUserAgent());
    assert.equal('fr', requestor.getLanguage());

    requestor.addIdentifier('test');
    assert(requestor.hasIdentifiers());
    assert.equal(3, _.size(requestor.getIdentifiers()));

    requestor.setIdentifiers(["foo", "bar"]);
    assert(requestor.hasIdentifiers());
    assert.equal(2, _.size(requestor.getIdentifiers()));

  });
});
