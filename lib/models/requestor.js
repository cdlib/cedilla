var Requestor = function(params) {
  this._identifiers = [];

  if (typeof params !== 'undefined') {
    if (typeof params.affiliation !== 'undefined') {
      this._affiliation = params.affiliation;
    }
    if (typeof params.ip !== 'undefined') {
      this._ip = params.ip;
    }
    if (typeof params.agent !== 'undefined') {
      this._agent = params.agent;
    }
    if (typeof params.language !== 'undefined') {
      this._language = params.language;
    }
    if (typeof params.identifiers !== 'undefined') {
      if (params.identifiers instanceof Array) {
        this._identifiers = params.identifiers;
      } else {
        this._identifiers.push(params.identifiers);
      }
    }
  }
};

Requestor.prototype.getAffiliation = function() {
  return this._affiliation;
};
Requestor.prototype.setAffiliation = function(affiliation) {
  this._affiliation = affiliation;
};
Requestor.prototype.getIp = function() {
  return this._ip;
};
Requestor.prototype.setIp = function(ip) {
  this._ip = ip;
};
Requestor.prototype.getLanguage = function() {
  return this._language;
};
Requestor.prototype.setLanguage = function(language) {
  this._language = language;
};
Requestor.prototype.getUserAgent = function() {
  return this._agent;
};
Requestor.prototype.setUserAgent = function(agent) {
  this._agent = agent;
};

Requestor.prototype.hasIdentifiers = function() {
  return _.size(this._identifiers) > 0;
};
Requestor.prototype.getIdentifiers = function() {
  return this._identifiers;
};
Requestor.prototype.setIdentifiers = function(ids) {
  if (ids instanceof Array) {
    this._identifiers = ids;
  } else {
    this._identifiers.push(ids);
  }
};
Requestor.prototype.addIdentifier = function(id) {
  this._identifiers.push(id);
};

module.exports = Requestor;