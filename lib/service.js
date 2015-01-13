/* -----------------------------------------------------------------------------------------------
 * Service: The service calls an external web service and passes in a JSON representation of the items
 *          passed in from the client. It then processes the standard JSON sent back from the target
 *          web service and converts it into item.js objects that it passes on to it's Tier for processing.
 *
 * The service makes a HTTP POST call passing JSON data to the target
 *
 * The configuration of the target's location and the rules surrounding how and when it will be called
 * are found in config/services.yaml
 * ----------------------------------------------------------------------------------------------- 
 */

"use strict";

var _ = require('underscore');
var util = require('util');
var events = require('events');
var uuid = require('node-uuid');

var CONFIGS = require("./config.js");
var helper = require("./utils/helper.js");
var url = require('url');
var serializer = require("./utils/serializer.js");
var Item = require("./models/item.js");


function Service(name, log) {

  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error(helper.buildMessage(CONFIGS.message.service_no_name));
  }

  var _config = {}, self = this;

  // Initialization  

  // Call the constructor for EventEmitter
  // Not necessary as handled by helper method util.inherits(Service, events.EventEmitter)?
  // Leaving per example in http://nodejs.org/docs/latest/api/util.html
  // however, no breakage detected with this commented out
  events.EventEmitter.call(this);

  this.log = log;
  this._name = helper.safeAssign('string', name, 'unknown');

// set the correct service config for the service instance
// for the array of services on each tier
  _.each(CONFIGS.services.tiers, function(services) {
// find a matching name for this service and assign its config to _config
    _.each(services, function(config, name) {
      if (name === self._name) {
        _config = config;
      }
    });
  });

  this._displayName = helper.safeAssign('string', _config.display_name, this._name);
  this._enabled = helper.safeAssign('boolean', _config.enabled, false);
  this._maxAttempts = helper.safeAssign('number', _config.max_attempts, 1);
  this._timeout = helper.safeAssign('number', _config.timeout, 30000);
  this._target = helper.safeAssign('string', _config.target, undefined);
  this._includeAdditionalAttributes = helper.safeAssign('boolean', _config.include_additional_attributes, false);
  this._itemTypesReturned = _config.item_types_returned || [];
  this._referrerBlock = _config.do_not_call_if_referrer_from || [];
  this._flattenJson = _config.flatten_json_to_service || false;
  this._translator = helper.safeAssign('string', _config.translator, undefined);

  // -----------------------------------------------------------------------------
  // Also emits 'success' and 'error' which are meant to be caught by the Tier
  // -----------------------------------------------------------------------------
  this.on('response', function(data) {
    if (data instanceof Array) {
      this.emit('success', data);
    } else {
      this.emit('error', data);
    }
  });
}

// -----------------------------------------------------------------------------------------------
util.inherits(Service, events.EventEmitter);

// -----------------------------------------------------------------------------------------------
Service.prototype.getReport = function() {
  return {"service": this._name,
    "id": this._id,
    "item": this._itemId,
    "duration": this._duration,
    "status": this._status,
    "response:": this._response};
};

// -----------------------------------------------------------------------------------------------
Service.prototype.setRequestInformation = function(params) {
  this._requestorParams = params;
};
// -----------------------------------------------------------------------------------------------
Service.prototype.getRequestInformation = function() {
  return this._requestorParams;
};

// -----------------------------------------------------------------------------------------------
Service.prototype.getName = function() {
  return this._name;
};
// -----------------------------------------------------------------------------------------------
Service.prototype.getDisplayName = function() {
  return this._displayName;
};
// -----------------------------------------------------------------------------------------------
Service.prototype.isEnabled = function() {
  return this._enabled;
};
// -----------------------------------------------------------------------------------------------
Service.prototype.getReferrerBlock = function() {
  return this._referrerBlock;
};
// -----------------------------------------------------------------------------------------------
Service.prototype.returnsItemType = function(type) {
  var self = this;
  return _.contains(self._itemTypesReturned, type);
};
// -----------------------------------------------------------------------------------------------
Service.prototype.toString = function() {
  return this._name;
};

// -----------------------------------------------------------------------------------------------
Service.prototype.call = function(item, headers) {
  var self = this;

  if (!self._target) {
    self.emit('response', self._buildError(_transactionId, 'fatal', 'service_no_target_defined'));
    return;
  }

  var _transactionId = uuid.v4(),
          _data = serializer.itemToJsonForService(_transactionId, item, this._requestorParams),
          _now = new Date(),
          _out = '',
          _http,
          _aborted = false,
          _destination = url.parse(self._target),
          _options = {hostname: _destination.hostname,
            port: _destination.port,
            path: _destination.path,
            method: 'POST',
            headers: {'Content-Type': 'text/json; charset="utf-8"',
              'Content-Length': Buffer.byteLength(_data),
              'Accept': 'text/json',
              'Accept-Charset': 'utf-8',
              'Cache-Control': 'no-cache'}};

  // Add any headers that were passed in onto the call
  _.forEach(headers, function(value) {
    _options.headers.key = value;
  });

  self._id = _transactionId;
  self._itemId = item.getId();
  self.log = self.log.child({service_id: _transactionId});
  self.log.info({object: 'service.js', service_name: self._name, post_data: JSON.parse(_data)}, 'Calling service');

  // Setup the correct library based on the URL's protocol
  if (_destination.protocol === 'https') {
    _http = require('https');
  } else {
    _http = require('http');
  }

  // Do the HTTP(S) Request
  var _request = _http.request(_options, function(response) {
    // ---------------------------------------------------
    response.setEncoding('utf8');

    // ---------------------------------------------------
    response.on('data', function(chunk) {

      // Limit the response size so we don't ever accidentally get a Buffer overload
      if (_out.length > CONFIGS.application.service_max_response_length) {
        _request.abort();
        _aborted = true;

        self.log.error({object: 'service.js', service_name: self._name, response: _out}, CONFIGS.message.service_buffer_overflow);

        self.emit('response', self._buildError(_transactionId, 'fatal', 'service_buffer_overflow'));

      } else {
        _out += chunk;
      }
    });

    // ---------------------------------------------------
    response.on('end', function() {
      var _rslt;

      var end = new Date().getTime();
      self._duration = (end - _now.getTime());
      self._status = response.statusCode;

      try {

        if (!_aborted) {
          switch (response.statusCode) {

            case 200: // SUCCESS
              var _json = JSON.parse(_out);

              self._response = _json;

              // If the result is for the current request then convert the json to objects
              if (_json.id === _transactionId) {
                if (typeof _json[item.getType() + 's'] !== 'undefined') {

                  // If the result from the service is an Array, convert each item and add it to the result
                  if (_json[item.getType() + 's'] instanceof Array) {
                    _rslt = [];

                    _.forEach(_json[item.getType() + 's'], function(it) {
                      _rslt.push(helper.mapToItem(item.getType(), false, it));
                    });

                  } else {
                    // Otherwise this is a single item so convert it and add it to the response
                    _rslt = helper.mapToItem(item.getType(), false, _json[item.getType() + 's'][0]);
                  }

                  // If the result is undefined then we received an undefined item type, so throw an error
                  if (typeof _rslt === 'undefined') {
                    self.emit('response', self._buildError(_transactionId, 'error', 'service_unknown_item'));

                  } else {
                    // successfully processed JSON response from target
                    self.log.debug({object: 'service.js', service_name: self._name, response: _json, response_status: response.statusCode}, 'Received response.');

                    self.emit('response', _rslt);
                  }

                } else {
                  self.emit('response', self._buildError(_transactionId, 'error', 'service_unknown_item'));
                }

              } else {
                self.emit('response', self._buildError(_transactionId, 'error', 'service_wrong_response'));
              }

              break;

            case 400: // BAD REQUEST
              self.emit('response', self._buildError(_transactionId, 'error', 'service_bad_request'));
              break;

            case 404: // NOT FOUND
              self.emit('response', [new Item(item.getType(), false, {})]);

              break;

            default: // ERROR!!!
              var json = JSON.parse(_out);
              self._response = json;
              self.log.error({object: 'service.js', service_name: self._name, response: _out, response_status: response.statusCode}, 'Unhandled HTTP response received.');

              if (typeof json.error !== 'undefined') {
                if (typeof json.error.level !== 'undefined') {
                  self.emit('response', self._buildError(_transactionId, json.error.level, json.error.message));
                } else {
                  self.emit('response', self._buildError(_transactionId, 'fatal', 'service_server_error_fatal'));
                }

              } else {
                // If there are multiple errors, send each one accordingly
                if (typeof json.errors !== 'undefined') {
                  _.forEach(json.errors, function(err) {
                    if (typeof err.level !== 'undefined') {
                      self.emit('response', self._buildError(_transactionId, err.level, err.message));
                    } else {
                      self.emit('response', self._buildError(_transactionId, 'fatal', 'service_server_error_fatal'));
                    }
                  });

                } else {
                  // Otherwise we were expecting an error to be there, but it had something else!
                  self.emit('response', self._buildError(_transactionId, 'fatal', 'service_server_error_fatal'));
                }
              }
              break;
          }

        } // if(!_aborted)

        item.addTransaction(self.getReport());

      } catch (e) {
        // If its invalid JSON
        if (e.message.indexOf('Unexpected token') >= 0) {
          self.emit('response', self._buildError(_transactionId, 'fatal', 'service_bad_json'));
          self.log.error({object: 'service.js', service_name: self._name}, CONFIGS.message.service_bad_json);

        } else {
          self.emit('response', self._buildError(_transactionId, 'error', 'service_server_error'));
          self.log.error({object: 'service.js', service_name: self._name}, CONFIGS.message.service_server_error);
        }

        self.log.error(e);
      }

    });

  }); // http.request 

  // --------------------------------------------------------------------------------------------
  _request.setTimeout(self._timeout, function() {
    self.log.warn({object: 'service.js', service_name: self._name}, 'Timeout while trying to connect to Service');

    _request.abort();

    self.emit('response', self._buildError(_transactionId, 'warning', 'service_timeout'));
  });

  // --------------------------------------------------------------------------------------------
  _request.on('error', function(e) {

    if (e.message.indexOf('ECONNREFUSED') >= 0) {
      self.log.error({object: 'service.js', service_name: self._name}, 'Service does not appear to be responding.');

      // Send a message to all notifiers since the service is likely offline
      helper.contactAllNotifiers('The ' + self._name + ' service appears to be offline: ECONNREFUSED.', function() {
      });

      self.emit('response', self._buildError(_transactionId, 'warning', 'service_connection_refused'));

    } else if (e.message.indexOf('socket hang up') >= 0) {
      self.log.error({object: 'service.js', service_name: self._name}, 'Timed out while trying to connect to service.');
      self.emit('response', self._buildError(_transactionId, 'warning', 'service_timeout'));

    } else {
      self.log.error({object: 'service.js', service_name: self._name}, 'An error occurred while connecting to service');
      self.emit('response', self._buildError(_transactionId, 'error', 'service_server_error'));
    }

    self.log.error({object: 'service.js', service_name: self._name}, e.message);
  });

  // Send the JSON to the service target
  _request.write(_data);
  _request.end();

};

// -----------------------------------------------------------------------------------------------
Service.prototype._buildError = function(transactionId, level, message) {
  var _msg = (typeof CONFIGS.message[message] !== 'undefined') ? helper.buildMessage(CONFIGS.message[message], [this._name]) : message;

  return new Item('error', true, {'level': level, 'message': _msg});
};


module.exports = exports = Service;