var server = require('http').createServer(onRequest),
		io = require('socket.io').listen(server),
		fs = require('fs'),
		url = require('url'),
		_ = require('underscore'),
		helper = require('./lib/helper.js'),
		configManager = require('./config/config.js');

server.listen(3005);

var Translator = require('./lib/translator.js'),
		Broker = require('./lib/broker.js'),
		Item = require('./lib/item.js');

var messages = undefined;

console.log('loading main');
configManager.getConfig('message', function(config){
	messages = config;
});

var broker = new Broker();

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
			var translator = new Translator('openurl');
			//var item = buildInitialCitation(translator, helper.queryStringToMap(data.toString()));
			var item = buildInitialItems(translator, helper.queryStringToMap(data.toString()));
			
			if(typeof item != undefined){
				console.log('translated openurl into: ' + item.toString());
				
				// Send the socket, configuration manager, and the item to the broker for processing
				broker.negotiate(socket, item);
				
			}else{
				// Warn about invalid item
				console.log('unable to build initial item from the openurl passed!');
				socket.emit('error', messages['broker_bad_item_message']);
			}
			
		}catch(e){
			console.log(e);
			socket.emit('error', messages['generic_http_error']);
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
function buildInitialItems(translator, map){
	var ret = undefined,
			itemDefinitions = undefined,
			openurl = undefined;
	
	configManager.getConfig('data', function(config){
		itemDefinitions = config['objects'];
	});
	configManager.getConfig('openurl', function(config){
		openurl = config;
	});
	
	// loop through the item types in the OpenURL mapping file definition
	_.forEach(openurl, function(mapping, type){
		var item = undefined;
		
		item = translator.mapToItem(type, true, map, true);
		
		// If this is the first item to be translated, make it the root
		if(typeof ret == 'undefined'){
			ret = item;
		
		}else{
			// If not, add it to the root item if its an appropriate child type
			if(typeof itemDefinitions[ret.getType()]['children'] != 'undefined'){
				if(_.contains(itemDefinitions[ret.getType()]['children'], item.getType())){
					ret.addAttribute(type + 's', [item]);
				}
			}
		}
		
	});
	
	return ret;
}

