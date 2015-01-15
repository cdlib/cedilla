/* -----------------------------------------------------------------------------------------------
 * TRANSLATOR
 *
 * This object works in conjunction with several YAML mapping files:
 *
 *   1) With config/xref.yaml to translate attribute values (e.g. citation.language 'en' => 'English')
 * 
 *   2) In conjunction with config/translation/[name].yaml to convert attribute names. The config/data.yaml
 *      file designates the internal names of an item's attributes and these translation files allow you
 *      to override those internal names when communicating with services. For example, a common use case
 *      can be found in cedilla.js. That file needs to convert OpenURL parameters into item.js objects.
 *      OpenURL allows many different parameter names that need to be converted over to match the attribute
 *      names found in config/data.yaml (e.g. 'rft.aulast' => author.last_name)
 *
 * ----------------------------------------------------------------------------------------------- 
 */

"use strict";

var _ = require('underscore');

var CONFIGS = require("../config.js");
var helper = require("../utils/helper.js");


var Translator = function(translatorName) {
  this._externalToInternal = {};
  this._internalToExternal = {};

  if (typeof translatorName !== 'undefined') {
    if (translatorName.toString().trim() !== '') {
      this._config = CONFIGS.translators[translatorName];
      this._initialize();

      // If the externalToInternal map is empty then the mapping file did not load and initialize!
      if (_.size(this._externalToInternal) <= 0) {
        throw new Error(helper.buildMessage(CONFIGS.message.missing_translator_mapping_file, [translatorName]));
      }

    }
  }
};

// -----------------------------------------------------------------------------------------------
// Uses config/xref.yaml to translate the specified value
// -----------------------------------------------------------------------------------------------
Translator.prototype.translateAttributeValue = function(itemType, attributeName, value) {
  // global avoid problem with empty object
  // possibly caused by transient circular dependency
  return getCrossReference(itemType, attributeName, value);
};

// -----------------------------------------------------------------------------------------------
// Uses the config/translation/[name].yaml file (specified on intialization) to convert the attribute name
// -----------------------------------------------------------------------------------------------
Translator.prototype.translateKey = function(key, to_external) {
  if (typeof to_external !== 'boolean') {
    to_external = false;
  }

  if (!to_external && (typeof this._externalToInternal[key] !== 'undefined')) {
    return this._externalToInternal[key];

  } else if (to_external && (typeof this._internalToExternal[key] !== 'undefined')) {
    return this._internalToExternal[key];

  } else {
    return key;
  }
};


// -----------------------------------------------------------------------------------------------
// Uses the config/translation/[name].yaml file (specified on intialization) to convert the attribute names
// -----------------------------------------------------------------------------------------------
Translator.prototype.translateMap = function(map, to_external) {
  var ret = {},
          self = this;

  if (typeof to_external !== 'boolean') {
    to_external = false;
  }

  _.forEach(map, function(value, key) {

    if (value instanceof Array) {
      if (key !== 'additional') {
        // If the attributes does not have the collection, initialize it
        if (typeof ret[key] === 'undefined') {
          ret[key] = [];
        }

        // translate each child and add it onto the attributes
        _.forEach(value, function(child) {
          if (typeof ret[self.translateKey(key, to_external)] === 'undefined') {
            ret[self.translateKey(key, to_external)] = [];
          }
          if ((typeof child !== 'string') && !(child instanceof Array)) {
            ret[self.translateKey(key, to_external)].push(self.translateMap(child, to_external));

          } else {
            // Otherwise its just a collection of values
            ret[self.translateKey(key, to_external)].push(child);
          }
        });

      } else {
        ret[key] = value;
      }
    } else {
      // translate the key
      ret[self.translateKey(key, to_external)] = value;
    }
  });

  return _.size(ret) > 0 ? ret : map;
};

// -----------------------------------------------------------------------------------------------
// Loads the contents of the config/translation/[name].yaml into 2 flattened HashMaps 
// -----------------------------------------------------------------------------------------------
Translator.prototype._initialize = function() {
  var self = this;

  _.forEach(self._config, function(externalName, internalName) {

    if (typeof externalName === 'string') {
      self._externalToInternal[externalName] = internalName;

      if (typeof self._internalToExternal[internalName] === 'undefined') {
        self._internalToExternal[internalName] = externalName;
      }

    } else {
      _.forEach(externalName, function(name) {
        self._externalToInternal[name] = internalName;

        if (typeof self._internalToExternal[internalName] === 'undefined') {
          self._internalToExternal[internalName] = name;
        }
      });
    }
  });
};

// -----------------------------------------------------------------------------------------------
module.exports = Translator;