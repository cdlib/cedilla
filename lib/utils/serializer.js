/* -----------------------------------------------------------------------------------------------
 * Serializer: The serializer handles the conversion of item.js objects over to standardized
 *             JSON data that can be sent to a target web service or back to the client.
 * -----------------------------------------------------------------------------------------------
 */

module.exports = {
  itemToJsonForClient: function(service, item) {
    var now = new Date(),
            message = '{"time":"' + now.toJSON() + '",' +
            '"api_ver":"' + CONFIGS['application']['client_api_version'] + '",' +
            '"service":"' + service + '",';

    if (item instanceof Item) {
      message += '"' + item.getType() + '":' + JSON.stringify(helper.itemToMap(item)).replace('\"', '"') + '}';
    } else {
      message += '"error":"' + item.message + '"}';
    }

    return message;
  },
  // -----------------------------------------------------------------------------------------------  
  itemToJsonForService: function(transactionId, item, requestorParams) {
    var now = new Date(),
            message = '{"time":"' + now.toJSON() + '",' +
            '"id":"' + transactionId + '"';

    if (typeof requestorParams === 'undefined') {
      requestorParams = {};
    }

    // Add the top level request information
    if (typeof requestorParams['api_ver'] !== 'undefined') {
      message += ',"api_ver":"' + requestorParams['api_ver'] + '"';
    }

    if (typeof requestorParams['referrers'] !== 'undefined') {
      message += ',"referrers":[';
      _.forEach(requestorParams['referrers'], function(domain) {
        message += ((message[message.length - 1] !== '[') ? ',' : '') + '"' + domain + '"';
      });
      message += ']';
    }

    if (typeof requestorParams['requestor_ip'] !== 'undefined') {
      message += ',"requestor_ip":"' + requestorParams['requestor_ip'] + '"';
    }
    if (typeof requestorParams['requestor_affiliation'] !== 'undefined') {
      message += ',"requestor_affiliation":"' + requestorParams['requestor_affiliation'] + '"';
    }
    if (typeof requestorParams['requestor_language'] !== 'undefined') {
      message += ',"requestor_language":"' + requestorParams['requestor_language'] + '"';
    }
    if (typeof requestorParams['unmapped'] !== 'undefined') {
      message += ',"unmapped":"' + requestorParams['unmapped'] + '"';
    }
    if (typeof requestorParams['original_request'] !== 'undefined') {
      message += ',"original_request":"' + requestorParams['original_request'] + '"';
    }

    message += ',';

    if (item instanceof Item) {
      var map = helper.itemToMap(item);

      message += '"' + item.getType() + '":' + JSON.stringify(map).replace('\"', '"');

    } else {
      message += '"' + helper.getRootItemType() + '":{}';
    }

    return message + '}';
  },
  // -----------------------------------------------------------------------------------------------  
  requestToJson: function(request) {
    var message = '{"start_time":"' + request.getStartTime() + '",' +
            '"end_time":"' + request.getEndTime() + '",' +
            '"service_api_ver":"' + request.getServiceApiVersion() + '",' +
            '"client_api_ver":"' + request.getClientApiVersion() + '",' +
            '"request_id":"' + request.getId() + '",' +
            '"request_type":"' + request.getType() + '",' +
            '"request_content_type":"' + request.getContentType() + '",' +
            '"requestor":' + this.requestorToJson(request.getRequestor()) + ',' +
            '"unmapped":"' + request.getUnmapped() + '",' +
            '"request":"' + request.getRequest() + '",';

    if (request.hasReferrers()) {
      message += '"referrers":[';
      _.forEach(request.getReferrers(), function(referrer) {
        message += (message[message.length - 1] === '[' ? '' : ',') + '"' + referrer + '"';
      });
      message += '],';
    }

    if (request.hasReferents()) {
      message += '"referents":[';
      _.forEach(request.getReferents(), function(item) {
        var map = helper.itemToMap(item);

        map['type'] = (item instanceof Item ? item.getType() : 'unknown item type');
        map['id'] = (item instanceof Item ? item.getId() : 'unknown item type');

        if (item instanceof Item) {
          if (_.size(item.getTransactions()) > 0) {
            map['transactions'] = item.getTransactions();
          }
        }

        message += (message[message.length - 1] === '[' ? '' : ',') + JSON.stringify(map);
      });
      message += '],';
    }

    if (request.hasErrors()) {
      message += '"errors":[';
      _.forEach(request.getErrors(), function(err) {
        message += (message[message.length - 1] === '[' ? '' : ',') + '"' + err.toString() + '"';
      });
      message += '],';
    }

    return message + '"duration":"' + request.getDuration() + '"}';
  },
  // -----------------------------------------------------------------------------------------------  
  requestorToJson: function(requestor) {
    var out = {};
    if (typeof requestor.getAffiliation() !== 'undefined') {
      out['affiliation'] = requestor.getAffiliation();
    }
    if (typeof requestor.getIp() !== 'undefined') {
      out['ip'] = requestor.getIp();
    }
    if (typeof requestor.getLanguage() !== 'undefined') {
      out['language'] = requestor.getLanguage();
    }
    if (typeof requestor.getUserAgent() !== 'undefined') {
      out['agent'] = requestor.getUserAgent();
    }
    if (requestor.hasIdentifiers()) {
      out['identifiers'] = requestor.getIdentifiers();
    }
    return JSON.stringify(out);
  }
};
