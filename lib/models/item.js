/* -----------------------------------------------------------------------------------------------
 * ITEM: This represents one of the Objects defined in config/data.yaml. 
 *
 * Object validation and relationships are stored in the validation section of the config. They
 * currently only allow for a 'required' style validation check
 *
 * The config file also defines the available attribute list, default values for those attributes,
 * whether or not it is the root object (the relationship between objects can only be hierarchical)
 * and whether or not the object has any children.
 *
 * The list of children defined in the config will be converted into arrays of other item.js objects.
 * the name of the array will become the name of the child with an 's' added to the end.
 * ----------------------------------------------------------------------------------------------- 
 */
var Item = function(type, assignDefaults, attributes) {
  // Make sure the item type was assigned and that it is defined in the config
  var _type = '';
  var _attributes = {};

  this._id = uuid.v4();
  this._translator = new Translator('');
  this._transactions = [];

  if (typeof type === 'string' && typeof CONFIGS['data']['objects'][type] !== 'undefined') {
    this._config = CONFIGS['data']['objects'][type];

    this._initialize(type, assignDefaults, attributes);

  } else {
    throw new Error(helper.buildMessage(CONFIGS['message']['undefined_item_type'], [type]));
  }
};

// -----------------------------------------------------------------------------------------------
Item.prototype.getId = function() {
  return this._id;
};
// -----------------------------------------------------------------------------------------------
Item.prototype.getType = function() {
  return this._type;
};
// -----------------------------------------------------------------------------------------------
Item.prototype.getTransactions = function() {
  return this._transactions;
};
// -----------------------------------------------------------------------------------------------
Item.prototype.addTransaction = function(report) {
  this._transactions.push(report);
};

// -----------------------------------------------------------------------------------------------
Item.prototype.hasAttributes = function() {
  return _.size(this._attributes) > 0;
};
// -----------------------------------------------------------------------------------------------
Item.prototype.getAttributes = function() {
  return this._attributes;
};
// -----------------------------------------------------------------------------------------------
Item.prototype.addAttributes = function(attributes) {
  var self = this;
  _.forEach(attributes, function(value, key) {
    self.addAttribute(key, value);
  });
};

// -----------------------------------------------------------------------------------------------
Item.prototype.hasAttribute = function(key) {
  return (typeof this._attributes[key] !== 'undefined');
};
// -----------------------------------------------------------------------------------------------
Item.prototype.getAttribute = function(key) {
  return this._attributes[key];
};
// -----------------------------------------------------------------------------------------------
Item.prototype.addAttribute = function(key, value) {
  if (_.contains(this._config['attributes'], key)) {
    this._attributes[key] = this._translator.translateAttributeValue(this._type, key, value);

  } else {
    if (value instanceof Array) {
      this._attributes[key] = value;

    }
  }
};
// -----------------------------------------------------------------------------------------------
Item.prototype.removeAttribute = function(key) {
  delete this._attributes[key];
};

// -----------------------------------------------------------------------------------------------
Item.prototype.toString = function() {
  var ret = "";

  _.forEach(this._attributes, function(value, key) {
    if (_.size(value) > 0 && value instanceof Array) {
      ret += '"' + key + '" = [';
      _.forEach(value, function(child) {
        if (child instanceof Item) {
          ret += '{' + child.toString() + '}, ';

        } else {
          _.forEach(child, function(value, key) {
            ret += '{' + key + ' = ' + value + '}';
          });
        }
      });
      ret = ret.slice(0, -2) + '], ';
    } else {
      ret += '"' + key + '" = "' + value + '", ';
    }
  });

  return ret.slice(0, -2);
};

// -----------------------------------------------------------------------------------------------
Item.prototype._initialize = function(type, assignDefaults, attributes) {
  var self = this;

  self._type = type;

  if (typeof self._attributes === 'undefined') {
    self._attributes = {}; //new Map(); 
  }

  self.addAttributes(attributes);

  // -------------------------------------------------
  if (typeof assignDefaults !== 'boolean') {
    assignDefaults = false;
  }

  // Assign the defaults if applicable
  if (assignDefaults) {
    // Set any defaults that have been defined if there is no existing value
    if (self._config['default'] !== undefined) {

      _.forEach(self._config['default'], function(value, key) {
        if (!self.hasAttribute(key)) {
          self.addAttribute(key, value);
        }
      });
    }
  }
};

// -----------------------------------------------------------------------------------------------
Item.prototype.isValid = function() {
  var self = this;
  var ret = true;
  var attrs = self._attributes;

  if (CONFIGS['data']['objects'][self._type]['validation'] !== undefined) {

    // Loop through the items in the list, these are 'AND' rules
    _.forEach(CONFIGS['data']['objects'][self._type]['validation'], function(andRule) {

      // Don't do any further tests if we've already failed!
      if (ret) {
        // If the rule is an array of values
        if (_.isArray(andRule)) {
          var valid = false;

          // Loop through those values and treat them as an 'OR' test
          _.forEach(andRule, function(orRule) {

            // If one of the items is present then the test passed
            if (typeof attrs[orRule] !== 'undefined') {
              valid = true;
            }
          });

          ret = valid;

        } else {
          // Otherwise there is only one value so make sure it exists
          if (typeof attrs[andRule] === 'undefined') {
            ret = false;
          }
        }
      }
    });
  }
  return ret;
};

// -----------------------------------------------------------------------------------------------
module.exports = Item;

