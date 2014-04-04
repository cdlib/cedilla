var server = require('http').createServer(onRequest),
		io = require('socket.io').listen(server),
		fs = require('fs'),
		url = require('url');

server.listen(3005);

/* -------------------------------------------------------------------------------------------
 * Load up the configuration files
 * 
 * This includes a listener that will reload the config files as they change, so no need to
 * restart this application when a config change is made :)
 * ------------------------------------------------------------------------------------------- */
var configManager = require('./config/config.js');

/* -------------------------------------------------------------------------------------------
 * Load other modules
 * ------------------------------------------------------------------------------------------- */
var Broker = require('./lib/broker.js');

var broker = new Broker();

/* -------------------------------------------------------------------------------------------
 * Default route
 * ------------------------------------------------------------------------------------------- */
function onRequest (request, response) { 
	var pathname = url.parse(request.url).pathname;
	var query = url.parse(request.url).query;
	
	console.log('received request for: ' + query);
	
	// This is a default page that opens up a socket.io connection with this server, so requests
	// originating from clients without the socket socket.io library get passed through properly
	fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      response.writeHead(500);
      return response.end('error loading index.html');
    }

    response.writeHead(200);
    response.end(data);
  });
}

/* -------------------------------------------------------------------------------------------
 * Setup the socket.io connection
 * ------------------------------------------------------------------------------------------- */
io.sockets.on('connection', function (socket) {
	
	socket.on('openurl', function (data) {
		console.log('dispatching services for: ' + data);
		
		try{
			var appConfig = configManager.getConfig('application');
			var rulesConfig = configManager.getConfig('rules');
			var serviceConfig = configManager.getConfig('services');
			
			// Send the socket, current rule set, current service set, and the request over to the broker
			// The broker will determine which services to dispatch and in what order
			broker.negotiate(socket, data, appConfig, serviceConfig, rulesConfig);
			
		}catch(e){
			console.log(e);
			socket.emit('error', configManager.getConfig('error')['generic_http_error']);
		}
		
		console.log('broker finished intializing ... waiting for responses');
  });

  socket.on('disconnect', function(){
	  console.log('connection terminated by client');
  });
	
});

