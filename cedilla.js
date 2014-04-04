var server = require('http').createServer(onRequest),
		io = require('socket.io').listen(server),
		fs = require('fs'),
		url = require('url');

server.listen(3005);

var ConfigurationManager = require('./config/config.js'),
		Broker = require('./lib/broker.js');

var broker = new Broker();
var configManager = new ConfigurationManager();

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
			// Send the socket, current rule set, current service set, and the request over to the broker
			// The broker will determine which services to dispatch and in what order
			broker.negotiate(socket, data, configManager);
			
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

