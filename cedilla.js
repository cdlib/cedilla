var CONFIGS = require('./lib/config.js'),
		LOGGER = require('./lib/logger.js');

var server = require('http').createServer(onRequest),
		io = require('socket.io').listen(server),
		fs = require('fs'),
		url = require('url'),
		querystring = require('querystring'),
		_ = require('underscore');
		
var helper = require('./lib/helper.js'),
		Translator = require('./lib/translator.js'),
		Broker = require('./lib/broker.js'),
		Item = require('./lib/item.js');
		
server.listen(3005);

/* -----------------------------------------------------------------------------------------
 * Primitive routing logic.
 * ----------------------------------------------------------------------------------------- */
function onRequest (request, response) {
  var pathname = url.parse(request.url).pathname;

  switch(pathname) {
    case '/':
      LOGGER.log ('debug', 'routing to index page');
      testPage (request, response);
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

/* -------------------------------------------------------------------------------------------
 * Default route
 * ------------------------------------------------------------------------------------------- */
function testPage (request, response) { 
	var pathname = url.parse(request.url).pathname;
	var query = url.parse(request.url).query;
	
	LOGGER.log('debug', 'received request for index.html: ' + query);
        LOGGER.log('debug', 'pathname is: ' + pathname);
	
	// This is a default page that opens up a socket.io connection with this server, so requests
	// originating from clients without the socket socket.io library get passed through properly
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

  if (!queryValid (query)) {
    response.writeHead(400);
    response.end('query not valid');
  }

  LOGGER.log('received request for citation JSON representation');
  translator = new Translator('openurl');
  var item = buildInitialItems(translator, querystring.parse(query));
  response.writeHead(200);
  response.setHeader('Content-Type', 'application/json');
  response.end(translator.itemToJSON(item));    
}

/*
 * TODO: basic query validation?
 */
function queryValid (query) {

  if (query) return true;
  return false;
}

/* -------------------------------------------------------------------------------------------
 * Setup the socket.io connection
 * ------------------------------------------------------------------------------------------- */
io.sockets.on('connection', function (socket) {
	
	socket.on('openurl', function (data) {
		LOGGER.log('debug', 'dispatching services for: ' + data);
		
		try{
			
			var translator = new Translator('openurl');
			var item = buildInitialItems(translator, querystring.parse(data.toString()));
			
			if(typeof item != undefined){
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


/* -------------------------------------------------------------------------------------------
 * Build the initial Items
 * ------------------------------------------------------------------------------------------- */
function buildInitialItems(translator, map){
	var ret = undefined;
	
	// loop through the item types in the OpenURL mapping file definition
	_.forEach(CONFIGS['openurl'], function(mapping, type){
		var item = undefined;
		
		item = translator.mapToItem(type, true, map, true);
		
		// If this is the first item to be translated, make it the root
		if(typeof ret == 'undefined'){
			ret = item;
		
		}else{
			// If not, add it to the root item if its an appropriate child type
			if(typeof CONFIGS['data']['objects'][ret.getType()] != 'undefined'){
				if(typeof CONFIGS['data']['objects'][ret.getType()]['children'] != 'undefined'){
				
					if(_.contains(CONFIGS['data']['objects'][ret.getType()]['children'], item.getType())){
						ret.addAttribute(type + 's', [item]);
					}
				
				}
			}
		}
		
	});
	
	return ret;
}

