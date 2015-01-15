"use strict";

var assert = require('assert');
var _ = require('underscore');

var Request = require("../../lib/models/request.js");

describe('request.js', function() {
  var params;

  // ------------------------------------------------------------------------------------------------------  
  before(function(done) {
    // Wait for the config file and initial modules have finished loading before starting up the server
    var delayStartup = setInterval(function() {
      // global avoids problem with log loading
      if (typeof global.cdla.Item !== 'undefined') {
        clearInterval(delayStartup);

        params = {"referrers": ["www.domain.org"],
          "affiliation": "CAMPUS-A",
          "ip": "127.0.0.1",
          "agent": "Chrome",
          "language": "en",
          "type": "test",
          "request": "foo=bar&yadda=yadda&blah=blah&abc=123",
          "unmapped": "foo=bar&yadda=yadda",
          "client_api_version": "0.1",
          "service_api_version": "0.2"};

        done();
      }
    });
  });

  // ------------------------------------------------------------------------------------------------------
  it('should be able to build out the requestor from the params on initialization!', function() {
    var request = new Request();

    assert(typeof request.getRequestor() !== 'undefined');

    request = new Request(params);
    var requestor = request.getRequestor();

    assert(typeof request.getRequestor() !== 'undefined');
    assert.equal('CAMPUS-A', requestor.getAffiliation());
    assert.equal('127.0.0.1', requestor.getIp());
    assert.equal('Chrome', requestor.getUserAgent());
    assert.equal('en', requestor.getLanguage());
  });

  // ------------------------------------------------------------------------------------------------------
  it('should assign the appropriate parameters when initialized!', function() {
    console.log('REQUEST: verifying object initialization.');

    // Should init properly when no params are passed in
    var request = new Request();

    assert(typeof request.getStartTime() !== 'undefined');
    assert(typeof request.getId() !== 'undefined');
    assert(typeof request.getRequestor() !== 'undefined');
    assert(typeof request.getRequestor().getAffiliation() === 'undefined');
    assert(typeof request.getType() === 'undefined');
    assert.equal(0, _.size(request.getReferents()));
    assert.equal(0, _.size(request.getErrors()));

    // Should init properly when empty params are passed in
    request = new Request({});

    assert(typeof request.getStartTime() !== 'undefined');
    assert(typeof request.getId() !== 'undefined');
    assert(typeof request.getRequestor() !== 'undefined');
    assert(typeof request.getRequestor().getAffiliation() === 'undefined');
    assert(typeof request.getType() === 'undefined');
    assert.equal(0, _.size(request.getReferents()));
    assert.equal(0, _.size(request.getErrors()));

    // Should init properly when a partial params is passed in
    request = new Request({"type": "test"});

    assert(typeof request.getStartTime() !== 'undefined');
    assert(typeof request.getId() !== 'undefined');
    assert(typeof request.getRequestor() !== 'undefined');
    assert(typeof request.getRequestor().getAffiliation() === 'undefined');
    assert(request.getType() === 'test');
    assert.equal(0, _.size(request.getReferents()));
    assert.equal(0, _.size(request.getErrors()));

    // Should ignore referrers if its not an array
    request = new Request({"referrers": "no an array!"});
    assert(_.size(request.getReferrers()) <= 0);

    // Should init properly when a full params is passed in
    request = new Request(params);

    assert(typeof request.getStartTime() !== 'undefined');
    assert(typeof request.getId() !== 'undefined');

    assert(request.getRequestor().getAffiliation() === 'CAMPUS-A');
    assert(request.getRequestor().getIp() === '127.0.0.1');
    assert(request.getRequestor().getUserAgent() === 'Chrome');
    assert(request.getRequestor().getLanguage() === 'en');

    assert(request.getType() === 'test');
    assert(request.getReferrers()[0] === 'domain.org');
    assert(request.getRequest() === 'foo=bar&yadda=yadda&blah=blah&abc=123');
    assert(request.getServiceApiVersion() === '0.2');
    assert(request.getClientApiVersion() === '0.1');
    assert(request.getUnmapped() === 'foo=bar&yadda=yadda');
    assert.equal(0, _.size(request.getReferents()));
    assert.equal(0, _.size(request.getErrors()));
  });

  // ------------------------------------------------------------------------------------------------------
  it('should be able to set end time and calculate duration!', function(done) {
    console.log('REQUEST: verifying end time and duration calculations.');

    var request = new Request(params);

    setTimeout(function() {
      var now = new Date();

      assert(typeof request.getStartTime() !== 'undefined');

      request.setEndTime(now);
      assert.equal((now.getTime() - request.getStartTime().getTime()), request.getDuration());
      assert(500 <= request.getDuration());

      done();

    }, 500);
  });

  // ------------------------------------------------------------------------------------------------------
  it('should be set and get the rest of the attributes!', function() {
    console.log('REQUEST: verifying getters and setters.');

    var request = new Request(params);

    assert.equal(request.getRequestor().getAffiliation(), 'CAMPUS-A');
    assert.equal(request.getRequestor().getIp(), '127.0.0.1');
    assert.equal(request.getRequestor().getUserAgent(), 'Chrome');
    assert.equal(request.getRequestor().getLanguage(), 'en');

    assert.equal(request.getType(), 'test');
    assert.equal(request.getReferrers()[0], 'domain.org');
    assert.equal(request.getRequest(), 'foo=bar&yadda=yadda&blah=blah&abc=123');
    assert.equal(request.getServiceApiVersion(), '0.2');
    assert.equal(request.getClientApiVersion(), '0.1');
    assert.equal(request.getUnmapped(), 'foo=bar&yadda=yadda');

    request.setType('foo');
    request.addReferrer('google.com');
    request.setRequest('foo=BAR&yadda=AAA&blah=BLAH&ABC=123');
    request.setServiceApiVersion('1.2');
    request.setClientApiVersion('1.1');
    request.setUnmapped('foo=BAR&yadda=AAA');

    assert.equal(request.getType(), 'foo');
    assert.equal(request.getReferrers()[0], 'domain.org');
    assert.equal(request.getReferrers()[1], 'google.com');
    assert.equal(request.getRequest(), 'foo=BAR&yadda=AAA&blah=BLAH&ABC=123');
    assert.equal(request.getServiceApiVersion(), '1.2');
    assert.equal(request.getClientApiVersion(), '1.1');
    assert.equal(request.getUnmapped(), 'foo=BAR&yadda=AAA');

    request.addUnmapped('tester', 'one');
    assert.equal(request.getUnmapped(), 'foo=BAR&yadda=AAA&tester=one');
  });

  // ------------------------------------------------------------------------------------------------------
  it('should be able to add errors and mapped items!', function() {
    console.log('REQUEST: verifying error and mapped item collections.');

    var request = new Request(params);

    assert(!request.hasErrors());
    assert(!request.hasReferents());

    request.addError(new Error('test 1'));
    request.addError(new Error('test 2'));

    request.addReferent({"foo": "bar1", "yadda1": "yadda"});
    request.addReferent({"foo": "bar2", "yadda2": "yadda"});

    assert(request.hasErrors());
    assert(request.hasReferents());
    assert(request.hasReferrers());

    assert.equal(2, _.size(request.getErrors()));
    assert.equal(2, _.size(request.getReferents()));
    assert.equal(1, _.size(request.getReferrers()));

    request.setReferents([{"foo": "bar"}, {"yadda": "yadda"}, {"blah": "blah"}]);
    request.setErrors([new Error('test 1'), new Error('test 2'), new Error('test 3')]);
    request.setReferrers(["my.site", "your.site", "their.site"]);

    assert(request.hasReferents());
    assert(request.hasErrors());
    assert(request.hasReferrers());
    assert.equal(3, _.size(request.getReferents()));
    assert.equal(3, _.size(request.getErrors()));
    assert.equal(3, _.size(request.getReferrers()));
  });

  // ------------------------------------------------------------------------------------------------------
  it('should be able to parse out the domain or ip of the referer!', function() {
    console.log('REQUEST: verifying parsing of referer information.');

    var request = new Request(params);
    var i;

    assert.equal(_.size(request.getReferrers()), 1);

    // Should parse out the domain
    request.addReferrer('http://www.domain.org/path/to/page?query=sting');
    request.addReferrer('www.domain.org');
    request.addReferrer('https://www.domain.org/path/');
    request.addReferrer('http://www.domain.org');
    request.addReferrer('domain.org');

    assert.equal(_.size(request.getReferrers()), 6);
    for (i = 1; i < 6; i++) {
      assert.equal(request.getReferrers()[i], 'domain.org');
    }

    // Should parse out the IP
    request.addReferrer('http://127.0.0.1:3005/path/to/page?query=sting');
    request.addReferrer('127.0.0.1:3005');
    request.addReferrer('https://127.0.0.1:3005/path/');
    request.addReferrer('http://127.0.0.1:3005');
    request.addReferrer('127.0.0.1');

    assert.equal(_.size(request.getReferrers()), 11);
    for (i = 6; i < 11; i++) {
      assert.equal(request.getReferrers()[i], '127.0.0.1');
    }

    // Should be ignored
    request.addReferrer('localhost');
    request.addReferrer('localhost:3005');
    request.addReferrer('ejkrngle3nglk3nglk3nglng');
    request.addReferrer(undefined);
    request.addReferrer('');

    assert.equal(_.size(request.getReferrers()), 11);
  });

});
