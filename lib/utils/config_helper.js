/* -----------------------------------------------------------------------------------------------
 * Config helper: helper methods for configuration data
 * -----------------------------------------------------------------------------------------------
 */

"use strict";

var _ = require('underscore');

var CONFIGS = require("../config.js");

module.exports = {
  // -----------------------------------------------------------------------------------------------
  // Method that replaces the '?' question marks in the message with the values in the incoming array
  // -----------------------------------------------------------------------------------------------
  buildMessage: function(message, values) {
    if (typeof message === 'string' && values instanceof Array) {
      _.forEach(values, function(value) {
        message = message.replace(/\?/, "'" + value.toString() + "'");
      });
    }

    return message;
  },
  // -----------------------------------------------------------------------------------------------  
  // Return the Item.js object defined as the hierarchical root in config/data.yaml
  // -----------------------------------------------------------------------------------------------
  getRootItemType: function() {
    var out = '';

    // Either take the first item in the ./config/data.yaml file or the one marked 'root'
    _.forEach(CONFIGS.data.objects, function(def, type) {
      if (out === '') {
        out = type;
      }

      if (typeof def.root !== 'undefined') {
        out = type;
      }
    });

    return out;
  },
  // -----------------------------------------------------------------------------------------------  
  // Return the Item.js object defined as the hierarchical root in config/data.yaml
  // -----------------------------------------------------------------------------------------------
  getCrossReference: function(itemType, attribute, value) {
    if (CONFIGS.xref[itemType]) {
      if (CONFIGS.xref[itemType][attribute]) {
        var ret = value;

        _.forEach(CONFIGS.xref[itemType][attribute], function(vals, xref) {
          if (_.contains(vals, value)) {
            ret = xref;
          }
        });

        return ret;

      } else {
        return value;
      }
    } else {
      return value;
    }
  },
  // -----------------------------------------------------------------------------------------------
  wasMapped: function(item, key) {
    var self = this;
    var unmapped;

    if (typeof item.getAttribute(key) === 'undefined') {
      unmapped = false;

      // Make sure its not mapped to one of the child items
      _.forEach(CONFIGS.data.objects[item.getType()].children, function(child) {
        _.forEach(item.getAttribute(child + 's'), function(kid) {
          unmapped = self.wasMapped(kid, key);
        });
      });

      return unmapped;

    } else {
      return true;
    }
  }
};
