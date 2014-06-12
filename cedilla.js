require('./init.js');

// Wait for the config file and init.js have finished loading before starting up the server
var delayStartup = setInterval(function(){
  if(typeof CONFIGS['application'] != 'undefined'){
    clearInterval(delayStartup);
    
    var server = require('http').createServer(onRequest),
        io = require('socket.io').listen(server),
        url = require('url'),
        defaultService = undefined,
        defaultServiceRunning = false;

    server.listen(CONFIGS['application']['port']);
    console.log(CONFIGS['application']['application_name'] + ' is now monitoring port ' + CONFIGS['application']['port']);

    // Stub service implementation only available when the application.yaml contains the serve_default_content parameter
    if(CONFIGS['application']['default_content_service'] && !defaultServiceRunning){
      defaultService = require('./lib/default_service');

      defaultService.startDefaultService(CONFIGS['application']['default_content_service_port']);
      defaultServiceRunning = true;
    }

    server.on('close', function(){
      // Stop the stub service if its running
      if(defaultServiceRunning){
        defaultService.close();
        defaultServiceRunning = false;
      }
    });

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
      LOGGER.log('debug', 'parsed query into key/value array: ' + JSON.stringify(query));
  
      var item = buildInitialItemsFromOpenUrl(query);
      LOGGER.log('debug', 'built item: ' + JSON.stringify(helper.itemToMap(item)));
  
      response.setHeader('Content-Type', 'application/json');
      response.writeHead(200);
      response.end(JSON.stringify(helper.itemToMap(item)));    
    }

    /* -------------------------------------------------------------------------------------------
     * Setup the socket.io connection
     * Handles the openurl event that is emitted by the client
     * ------------------------------------------------------------------------------------------- */
    io.sockets.on('connection', function (socket) {
      var self = this;
  
      socket.on('openurl', function (data) {
        LOGGER.log('debug', 'dispatching services for: ' + data);
    
        try{
          var item = buildInitialItemsFromOpenUrl(data.toString());

          if(item instanceof Item){
            LOGGER.log('debug', 'translated openurl into: ' + item.toString());

            // Send the socket, configuration manager, and the item to the broker for processing
            var broker = new Broker(socket, item);
        
          }else{
            // Warn about invalid item
            LOGGER.log('warn', 'unable to build initial item from the openurl passed: ' + data.toString() + ' !')
        
            var err = new Item('error', false, {'level':'error','message':CONFIGS['message']['broker_bad_item_message']});
            socket.emit(serializer.itemToJsonForClient('cedilla', err));
          }
      
        }catch(e){
          LOGGER.log('error', 'cedilla.js socket.on("openurl"): ' + e.message);
          LOGGER.log('error', e.stack);
  
          var err = new Item('error', false, {'level':'error','message':CONFIGS['message']['generic_http_error']});
          socket.emit(serializer.itemToJsonForClient('cedilla', err));
        }
    
        LOGGER.log('debug', 'broker finished intializing ... waiting for responses');
      });
  
    });

    // -------------------------------------------------------------------------------------------
    function buildInitialItemsFromOpenUrl(queryString){
      var qs = helper.queryStringToMap(queryString);

      var translator = new Translator('openurl');
      var map = translator.translateMap(qs, false);

      LOGGER.log('debug', 'translated flat map: ' + JSON.stringify(map));

      map['original_citation'] = queryString;

      return helper.flattenedMapToItem('citation', true, map);
    }
  }
});
