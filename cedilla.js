var server = require('http').createServer(onRequest),
		io = require('socket.io').listen(server),
		fs = require('fs'),
		url = require('url'),
		_ = require('underscore'),
		helper = require('./lib/helper.js');

server.listen(3005);

var ConfigurationManager = require('./config/config.js'),
		Translator = require('./lib/translator.js'),
		Broker = require('./lib/broker.js');

var broker = new Broker();
var configManager = new ConfigurationManager();

/* -------------------------------------------------------------------------------------------
 * Default route
 * ------------------------------------------------------------------------------------------- */
function onRequest (request, response) { 
	var pathname = url.parse(request.url).pathname;
	var query = url.parse(request.url).query;
	
	console.log('received request for index.html');
	
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
			var translator = new Translator(configManager.getConfig('mapping_openurl'));
			var citation = buildInitialCitation(translator, helper.queryStringToMap(data.toString()));
			
			// Send the socket, configuration manager, and the citation to the broker for processing
			broker.negotiate(socket, configManager, citation);
			
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


/* -------------------------------------------------------------------------------------------
 * Build the initial Citation and Author object based on the Map of attributes
 * ------------------------------------------------------------------------------------------- */
function buildInitialCitation(translator, map){
	var citation = translator.mapToCitation(map);
	var author = translator.mapToAuthor(map);

	console.log(citation.isValid());

	// If either the genre or content_type was not supplied get the default
	if(citation.getGenre() == undefined){
		citation.addAttribute('genre', configManager.getConfig('application')['default_genre']); 
	}
	if(citation.getContentType() == undefined){
		citation.addAttribute('content_type', configManager.getConfig('application')['default_content_type']); 
	}
	
	// Add the author if 
	if(author.isValid()){
		citation.addAuthor(author);
	}
	
	return citation;
}

