var express = require('express'),
		bodyParser = require('body-parser'),
		methodOverride = require('method-override'),
		router = require('./router'),
		path = require('path');

var app = express();

app.set('port', (CONFIGS['application']['port'] || 3000));
app.set('views', __dirname.replace('/lib', '/views'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname.replace('lib', ''), 'public')));

// Routing
app.use('/', router);

var server = require('http').Server(app),
		io = require('socket.io')(server);

// Bind to the port specified in the config/application.yaml or the default 3000
// ----------------------------------------------------------------------------------------------
server.listen(app.get('port'), function(){
	console.log(CONFIGS['application']['application_name'] + ' is now monitoring port ' + CONFIGS['application']['port']);
});


// ----------------------------------------------------------------------------------------------
io.on('connection', function (socket) {

  socket.on('openurl', function (data) {
    LOGGER.log('debug', 'Received OpenUrl request for: ' + data);

    try{
      // Construct Request object based on the app config and the incoming HTTP Request info
      var request = buildRequestFromSocket(socket);
                          
      // Record the original request
      request.setRequest(data.toString().replace('"', '&quot;'));
      
			var parser = new OpenUrlParser(request.getRequest());
			
			processCedillaInformation(request, function(rqst){
			
				handleConsortialRecognition(rqst, (socket.handshake.address ? socket.handshake.address['address'] : ''), function(req){
					
					parser.parse(req, function(r){
            // Send the socket, and request object over to the Broker for processing
            var broker = new Broker(socket, r);
          
            // Process each requested item 
            _.forEach(r.getReferents(), function(item){
              broker.processRequest(item);
            });
					});
					
				});
			});
      
    }catch(e){
      LOGGER.log('error', 'cedilla.js socket.on("openurl"): ' + e.message);
      LOGGER.log('error', e.stack);

      var err = new Item('error', false, {'level':'error','message':CONFIGS['message']['generic_http_error']});
      socket.emit(serializer.itemToJsonForClient('cedilla', err));
    }

    LOGGER.log('debug', 'broker finished intializing ... waiting for responses');
  });

});

module.exports = server;


// ----------------------------------------------------------------------------------------------
var buildRequestFromSocket = function(socket){
	var request = new Request({'content_type': (socket.handshake.headers ? socket.handshake.headers['content-type'] : 'text/html'),
                            'agent': (socket.handshake.headers ? socket.handshake.headers['user-agent'] : ''),
                            'language': (socket.handshake.headers ? socket.handshake.headers['accept-language'] : 'en'),
                            'service_api_version': CONFIGS['application']['service_api_version'],
                            'client_api_version': CONFIGS['application']['client_api_version']});
														
  // Collect the Referrers
  if(socket.handshake.headers['host']) request.addReferrer(socket.handshake.headers['host']);
  if(socket.handshake.headers['referer']) request.addReferrer(socket.handshake.headers['referer']);
	
	return request;
}

// ----------------------------------------------------------------------------------------------
// Process any parameters that are specific to Cedilla
// ----------------------------------------------------------------------------------------------
var processCedillaInformation = function(request, callback){
  var hash = helper.queryStringToMap(request.getRequest()),
			cleanedRequest = '';

  _.forEach(hash, function(value, key){
    // If a consortial affiliation was passed in, assign it!
    if(key == CONFIGS['application']['openurl_client_affiliation']){
      request.getRequestor().setAffiliation(value);
		}else{
			cleanedRequest += key + '=' + value + '&';
		}
  });

  if(cleanedRequest.length > 0){ cleanedRequest = cleanedRequest.slice(0, -1); }

  request.setUnmapped(cleanedRequest.replace('"', '\\"'));
	
	callback(request);
};

// ----------------------------------------------------------------------------------------------
// Call the Consortial Service if enabled to determine the user's campus affiliation
// ----------------------------------------------------------------------------------------------
function handleConsortialRecognition(request, ip, callback){
  var done = false;
  
  // If the configuration is setup to retrieve consortial information
  if(CONFIGS['application']['consortial_service']){
    // Get the affiliation for the client
    try{
      var consortial = new Consortial();
  
      if(!request.getRequestor().getAffiliation()){
        if(!request.getRequestor().getIp()){
          // No campus affiliation OR IP was specified, so trying to translate the incoming IP
          consortial.translateIp(ip, function(code){
            consortial.translateCode(code, function(ip){
              if(ip != 'unknown'){
                request.getRequestor().setIp(ip);
              }
              done = true;
            });
            request.getRequestor().setAffiliation(code);
          });
          
        }else{
          // IP was specified so get the code
          consortial.translateIp(request.getRequestor().getIp(), function(code){
            request.getRequestor().setAffiliation(code);
            done = true;
          });
        }
        
      }else{
        // A campus affilition was specified so get the generic VPN IP
        consortial.translateCode(request.getRequestor().getAffiliation(), function(ip){
          request.getRequestor().setIp(ip);
          done = true;
        });
      }
  
    }catch(err){
      LOGGER.log('error', err.message);
      request.addError(CONFIGS['message']['broker_consortial_error']);
    }
    var j = 0; // Safety check in case the consortial service is enabled in config but happens to be offline
    var waitUntilDone = setInterval(function(){
      if(done || j >= CONFIGS['application']['consortial_service']['timeout']){
        clearInterval(waitUntilDone);
        callback(request);
      }
      j++;
    }, 50);
    
  }else{
    callback(request);
  }
}