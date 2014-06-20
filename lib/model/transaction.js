var Transaction = function(params) {
  this._start = new Date().getTime();
  this._id = uuid.v4();

  if(typeof params != 'undefined'){
    if(typeof params['service'] != 'undefined'){ this._service = params['service']; };
    if(typeof params['id'] != 'undefined'){ this._id = params['id']; };
    if(typeof params['status'] != 'undefined'){ this._status = params['status']; };
    if(typeof params['response'] != 'undefined'){ this._response = params['response']; };
  }
};

Transaction.prototype.getStartTime = function(){ return this._start; };
Transaction.prototype.getEndTime = function(){ return this._end; };
Transaction.prototype.setEndTime = function(time){ this._end = time; };
Transaction.prototype.getDuration = function(){ return this._end - this._start; };

Transaction.prototype.getService = function(){ return this._service; };
Transaction.prototype.setService = function(service){ this._service = service; };
Transaction.prototype.getId = function(){ return this._id; };
Transaction.prototype.getStatus = function(){ return this._status; };
Transaction.prototype.setStatus = function(code){ this._status = code; };
Transaction.prototype.getResponse = function(){ return this._response; };
Transaction.prototype.setResponse = function(content){ this._response = content; };

module.exports = Transaction;