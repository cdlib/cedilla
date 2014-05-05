var CONFIGS = require('./lib/config.js'),
		LOGGER = require('./lib/logger.js');

var server = require('http').createServer(onRequest),
		io = require('socket.io').listen(server),
		fs = require('fs'),
		url = require('url'),
		_ = require('underscore');
		
var helper = require('./lib/helper.js'),
		Translator = require('./lib/translator.js'),
		Item = require('./lib/item.js'),
		Broker = require('./lib/broker.js');

server.listen(3005);

/* -----------------------------------------------------------------------------------------
 * Primitive routing logic.
 * This is the HTTP entry point to the application.
 * ----------------------------------------------------------------------------------------- */
function onRequest (request, response) {
  try {
    var pathname = url.parse(request.url).pathname;
    switch(pathname) {
      case '/':
        LOGGER.log ('debug', 'routing to index page');
        homePage (request, response);
        break;
      case '/citation':
        LOGGER.log ('debug', 'routing to citation service');
        citationService (request, response);
        break;
      default:
        LOGGER.log ('debug', 'resource not found');
        response.writeHead(404);
        response.end('resource not found');
    }
  } 
  catch (err) {
        var errMsg = "Cedilla server error. " + err;
        LOGGER.log ('error', errMsg);
        response.writeHead(500);
        response.end(errMsg);
  }
}

/* -------------------------------------------------------------------------------------------
 * Default route
 * This displays index.html.
 * ------------------------------------------------------------------------------------------- */
function homePage (request, response) { 
	var pathname = url.parse(request.url).pathname;
	var query = url.parse(request.url).query;
	
	LOGGER.log('debug', 'received request for index.html: ' + query);
        LOGGER.log('debug', 'pathname is: ' + pathname);
	fs.readFile(__dirname + '/index.html', function (err, data) {
    if (err) {
      response.writeHead(500);
      return response.end('error loading index.html');
    }

    response.writeHead(200);
    response.end(data);
  });
}


/* -------------------------------------------------------------------------------------------
 * Citation service
 * This service takes an OpenURL as input and returns a JSON representation of the citation.
 * ------------------------------------------------------------------------------------------- */
function citationService (request, response) {
  var query = url.parse(request.url).query;
  var queryValid = function () {
    // TODO: validation logic
    if (query) return true;
    return false;
  }

  if (!queryValid()) {
    response.writeHead(400);
    response.end('query not valid');
  }

  LOGGER.log('received request for citation JSON representation');
  translator = new Translator('openurl');
  var item = buildInitialItems(translator, querystring.parse(query));
  response.setHeader('Content-Type', 'application/json');
  response.writeHead(200);
  response.end(translator.itemToJSON(item));    
}

/* -------------------------------------------------------------------------------------------
 * Setup the socket.io connection
 * Handles the openurl event that is emitted by the client
 * ------------------------------------------------------------------------------------------- */
io.sockets.on('connection', function (socket) {
	
	socket.on('openurl', function (data) {
		LOGGER.log('debug', 'dispatching services for: ' + data);
		
		try{
			var qs = helper.queryStringToMap(data.toString());

			var translator = new Translator('openurl');
			var map = translator.translateMap(qs);

			var item = helper.mapToItem('citation', true, map);

			if(item instanceof Item){
				LOGGER.log('debug', 'translated openurl into: ' + item.toString());

				// Send the socket, configuration manager, and the item to the broker for processing
				var broker = new Broker(socket, item);
				
			}else{
				// Warn about invalid item
				LOGGER.log('warn', 'unable to build initial item from the openurl passed: ' + data.toString() + ' !')
				
				socket.emit('error', CONFIGS['message']['broker_bad_item_message']);
			}
			
		}catch(e){
			LOGGER.log('error', 'cedilla.js socket.on("openurl"): ' + e.message);
			LOGGER.log('error', e.stack);
			
			socket.emit('error', CONFIGS['message']['generic_http_error']);
		}
		
		LOGGER.log('debug', 'broker finished intializing ... waiting for responses');
  });
	
});



