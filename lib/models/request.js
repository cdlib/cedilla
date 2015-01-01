var Request = function(params) {
  this._start = new Date();
  this._id = uuid.v4();

  this._referents = [];
  this._errors = [];
  this._referrers = [];

  // Attempt to build the requestor by simply passing the params along
  this._requestor = new Requestor(params);

  if (typeof params !== 'undefined') {
    if (typeof params['referrers'] !== 'undefined') {
      if (params['referrers'] instanceof Array) {
        var self = this;
        _.forEach(params['referrers'], function(referrer) {
          self.addReferrer(referrer);
        });
      } else {
        this.addReferrer(params['referrers']);
      }
    }
    if (typeof params['type'] !== 'undefined') {
      this._type = params['type'];
    }
    if (typeof params['content_type'] !== 'undefined') {
      this._contentType = params['content_type'];
    }
    if (typeof params['request'] !== 'undefined') {
      this._request = params['request'];
    }
    if (typeof params['unmapped'] !== 'undefined') {
      this._unmapped = params['unmapped'];
    }
    if (typeof params['client_api_version'] !== 'undefined') {
      this._c_api_ver = params['client_api_version'];
    }
    if (typeof params['service_api_version'] !== 'undefined') {
      this._s_api_ver = params['service_api_version'];
    }
  }
};

Request.prototype.getStartTime = function() {
  return this._start;
};
Request.prototype.getEndTime = function() {
  return this._end;
};
Request.prototype.setEndTime = function(time) {
  this._end = time;
};
Request.prototype.getDuration = function() {
  if (this._end instanceof Date && this._start instanceof Date) {
    return this._end.getTime() - this._start.getTime();
  }
};

Request.prototype.getRequestor = function() {
  return this._requestor;
};
Request.prototype.setRequestor = function(requestor) {
  this._requestor = (requestor instanceof Requestor ? requestor : new Requestor(requestor));
};

Request.prototype.getClientApiVersion = function() {
  return this._c_api_ver;
};
Request.prototype.setClientApiVersion = function(version) {
  this._c_api_ver = version;
};
Request.prototype.getContentType = function() {
  return this._contentType;
};
Request.prototype.setContentType = function(contentType) {
  this._contentType = contentType;
};
Request.prototype.getId = function() {
  return this._id;
};
Request.prototype.getLanguage = function() {
  return this._language;
};
Request.prototype.setLanguage = function(language) {
  this._language = language;
};
Request.prototype.getRequest = function() {
  return this._request;
};
Request.prototype.setRequest = function(content) {
  this._request = content;
};
Request.prototype.getServiceApiVersion = function() {
  return this._s_api_ver;
};
Request.prototype.setServiceApiVersion = function(version) {
  this._s_api_ver = version;
};
Request.prototype.getType = function() {
  return this._type;
};
Request.prototype.setType = function(type) {
  this._type = type;
};
Request.prototype.getUserAgent = function() {
  return this._agent;
};
Request.prototype.setUserAgent = function(agent) {
  this._agent = agent;
};

Request.prototype.getErrors = function() {
  return this._errors;
};
Request.prototype.setErrors = function(errs) {
  return this._errors = errs;
};
Request.prototype.getReferents = function() {
  return this._referents;
};
Request.prototype.setReferents = function(items) {
  this._referents = items;
};
Request.prototype.getReferrers = function() {
  return this._referrers;
};
Request.prototype.setReferrers = function(referrers) {
  if (referrers instanceof Array) {
    this._referrers = referrers;
  } else {
    this._referrers.push(referrers);
  }
};
Request.prototype.getUnmapped = function() {
  return this._unmapped;
};
Request.prototype.setUnmapped = function(unmapped) {
  this._unmapped = unmapped;
};

Request.prototype.hasErrors = function() {
  return _.size(this._errors) > 0;
};
Request.prototype.hasReferents = function() {
  return _.size(this._referents) > 0;
};
Request.prototype.hasReferrers = function() {
  return _.size(this._referrers) > 0;
};
Request.prototype.hasUnmapped = function() {
  return this._unmapped.length > 0;
};

Request.prototype.addError = function(error) {
  this._errors.push(error);
};
Request.prototype.addReferent = function(item) {
  this._referents.push(item);
};
Request.prototype.addReferrer = function(referrer) {
  if (typeof referrer === 'string') {
    // Just grab the domain or the ip!
    var matches = referrer.match(/(\.[A-Za-z0-9\-_]{3,63}\.[a-zA-Z]{2,6})|(([0-9]{1,3}\.){3}[0-9]{1,3})/);

    if (matches) {
      if (matches.length > 0) {
        // Strip off the leading dot in the domain that was found
        this._referrers.push((matches[0][0] === '.' ? matches[0].substring(1, matches[0].length) : matches[0]));
      }

    } else {
      // See if it came in as the domain.extension only
      matches = referrer.match(/[A-Za-z0-9\-_]{3,63}\.[a-zA-Z]{2,6}/);
      if (matches) {
        this._referrers.push(matches[0]);
      }
    }
  }
};
Request.prototype.addUnmapped = function(key, value) {
  this._unmapped += (this._unmapped.length > 0 ? '&' : '') + key + '=' + value;
};

module.exports = Request;