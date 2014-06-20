var Request = function(params) {
  this._start = new Date().getTime();
  this._id = uuid.v4();

  this._mapped = [];
  this.errors = [];
  this.transactions = [];

  if(typeof params != 'undefined'){
    if(typeof params['referrer'] != 'undefined'){ this._referrer = params['referrer']; }
    if(typeof params['affiliation'] != 'undefined'){ this._affiliation = params['affiliation']; }
    if(typeof params['ip'] != 'undefined'){ this._ip = params['ip']; }
    if(typeof params['agent'] != 'undefined'){ this._agent = params['agent']; }
    if(typeof params['language'] != 'undefined'){ this._language = params['language']; }
    if(typeof params['type'] != 'undefined'){ this._type = params['type']; }
    if(typeof params['request'] != 'undefined'){ this._request = params['request']; }
    if(typeof params['unmapped'] != 'undefined'){ this._unmapped = params['unmapped']; }
    if(typeof params['client_api_version'] != 'undefined'){ this._c_api_ver = params['client_api_version']; }
    if(typeof params['service_api_version'] != 'undefined'){ this._s_api_ver = params['service_api_version']; }
  }
};

Request.prototype.getStartTime = function(){ return this._start; };
Request.prototype.getEndTime = function(){ return this._end; };
Request.prototype.setEndTime = function(time){ this._end = time; };
Request.prototype.getDuration = function(){ return this._end - this._start; };

Request.prototype.getId = function(){ return this._id; };
Request.prototype.getReferrer = function(){ return this._referrer; };
Request.prototype.setReferrer = function(referrer){ this._referrer = referrer; };
Request.prototype.getAffiliation = function(){ return this._affiliation; };
Request.prototype.setAffiliation = function(code){ this._affiliation = code; };
Request.prototype.getIp = function(){ return this._ip; };
Request.prototype.setIp = function(ip){ this._ip = ip; };
Request.prototype.getUserAgent = function(){ return this._agent; };
Request.prototype.setUserAgent = function(agent){ this._agent = agent; };
Request.prototype.getLanguage = function(){ return this._language; };
Request.prototype.setLanguage = function(language){ this._language = language; };
Request.prototype.getType = function(){ return this._type; };
Request.prototype.setType = function(type){ this._type = type; };
Request.prototype.getRequest = function(){ return this._request; };
Request.prototype.setRequest = function(content){ this._request = content; };
Request.prototype.getServiceApiVersion = function(){ return this._s_api_ver; };
Request.prototype.setServiceApiVersion = function(version){ this._s_api_ver = version; };
Request.prototype.getClientApiVersion = function(){ return this._c_api_ver; };
Request.prototype.setClientApiVersion = function(version){ this._c_api_ver = version; };
Request.prototype.getUnmapped = function(){ return this._unmapped; };
Request.prototype.setUnmapped = function(unmapped){ this._unmapped = unmapped; };

Request.prototype.getMappedItems = function(){ return this._mapped; };
Request.prototype.setMappedItems = function(items){ this._mapped = items; };
Request.prototype.getErrors = function(){ return this._errors; };
Request.prototype.getTransactions = function(){ return this._transactions; };

Request.prototype.hasErrors = function(){ return _.size(this._errors) > 0; };
Request.prototype.hasMappedItems = function(){ return _.size(this._mapped) > 0; };
Request.prototype.hasTransactions = function(){ return _.size(this._transactions) > 0; };

Request.prototype.addError = function(error){ this._errors.push(error); };
Request.prototype.addMappedItem = function(item){ this._mapped.push(item); };
Request.prototype.addTransaction = function(transaction){ this._transaction.push(transaction); };
Request.prototype.addUnmapped = function(key, value){ this._unmapped += (this._unmapped.length > 0 ? '&' : '') + key + '=' + value };

module.exports = Request;