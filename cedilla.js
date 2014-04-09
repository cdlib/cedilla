var server = require('http').createServer(onRequest),
		io = require('socket.io').listen(server),
		fs = require('fs'),
		url = require('url'),
		_ = require('underscore'),
		helper = require('./lib/helper.js');

server.listen(3005);

var ConfigurationManager = require('./config/config.js'),
		Translator = require('./lib/translator.js'),
		Broker = require('./lib/broker.js'),
		Item = require('./lib/item.js');

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
			var translator = new Translator(configManager, 'mapping_openurl');
			//var item = buildInitialCitation(translator, helper.queryStringToMap(data.toString()));
			var item = buildInitialItems(configManager.getConfig('application')['objects'], translator, 
																																		helper.queryStringToMap(data.toString()));
			
			if(typeof item != undefined){
				console.log('translated openurl into: ' + item.toString());
				
				// Send the socket, configuration manager, and the item to the broker for processing
				broker.negotiate(socket, configManager, item);
				
			}else{
				// Warn about invalid item
				console.log('unable to build initial item from the openurl passed!');
				socket.emit('error', configManager.getConfig('error')['broker_bad_item_message']);
			}
			
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
 * Build the initial Items
 * ------------------------------------------------------------------------------------------- */
function buildInitialItems(item_definitions, translator, map){
	var item = undefined;
	
	_.forEach(item_definitions, function(value, key){
		// If we haven't already defined the item
		if(typeof item == 'undefined'){
			item = translator.mapToItem(key, true, map);
			
			// Try to load any children if there are any defined
			_.forEach(value['children'], function(name){
				var child = translator.mapToItem(name, true, map);
				
				// If the child passes the validation check add it to the item
				if(child.isValid()){
					item.addAttribute(name + 's', new Array([child]));
				}
			});
			
		}
		
	});
	
	return item;
}

