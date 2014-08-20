var Notifier = function(config){
  this._config = config;
  
  var mailer = require('nodemailer');

  if(this._config['service']){
    this._transport = mailer.createTransport('SMTP', {service: this._config['service'],
                                                      auth: {user: this._config['username'], pass: this._config['password']}});
  }else{
    this._transport = mailer.createTransport();
  }
};

// ------------------------------------------------------------------------------------------------
Notifier.prototype.sendMessage = function(message, callback){
  var options = {from: this._config['from'],
                 to: this._config['to'],
                 subject: this._config['subject'],
                 text: message}
  
  try{
    this._transport.sendMail(options, function(err){
      if(err) log.error({object: 'email.js'}, err.message);
      
      callback(err);
    });
    
  }catch(e){
    callback('Error connecting to Slack: ' + e.message);
  }            
};

module.exports = Notifier;
