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
      defaultService = require('./lib/util/default_service');

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
  
      buildInitialItemsFromOpenUrl(query, function(item, leftovers){
        LOGGER.log('debug', 'built item: ' + JSON.stringify(helper.itemToMap(item)));
  
        response.setHeader('Content-Type', 'application/json');
        response.writeHead(200);
        response.end(JSON.stringify(helper.itemToMap(item)));    
      });
      
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
          // Construct Request object based on the app config and the incoming HTTP Request info
          _request = new Request({'content_type': (socket.handshake.headers ? socket.handshake.headers['content-type'] : 'text/html'),
                                  'agent': (socket.handshake.headers ? socket.handshake.headers['user-agent'] : ''),
                                  'language': (socket.handshake.headers ? socket.handshake.headers['accept-language'] : 'en'),
                                  'service_api_version': CONFIGS['application']['service_api_version'],
                                  'client_api_version': CONFIGS['application']['client_api_version']});
                                  
          // Record the original request
          _request.setRequest(data.toString().replace('"', '&quot;'));
          
          // Collect the Referrers
          if(socket.handshake.headers['host']) _request.addReferrer(socket.handshake.headers['host']);
          if(socket.handshake.headers['referer']) _request.addReferrer(socket.handshake.headers['referer']);
          
          // Build the initial items from the incoming openurl (Should result in a Citation and one or more authors)
          buildInitialItemsFromOpenUrl(data.toString(), function(item, leftovers){
            
            if(item instanceof Item){
              // Any data that could not be mapped to specified attributes on the items can be processed here
              processUnmappedInformation(_request, leftovers, item);
            
              // Do the consortial check here to map IP address to campus/consortial code and vice versa
              handleConsortialRecognition(_request, (socket.handshake.address ? socket.handshake.address['address'] : ''), function(request){
                // Call the openurl specializer to parse ids out of the weird openUrl identifier fields, 
                // deal with multiple authors, and attempt to detect the appropriate genre
                var format = specializers.newSpecializer('openurl', item, request).specialize();
                LOGGER.log('debug', 'item specialization: ' + JSON.stringify(item));
            
                request.setType(format);
                request.addReferent(item);
          
                LOGGER.log('debug', 'translated openurl into: ' + item.toString());

                // Send the socket, and request object over to the Broker for processing
                var broker = new Broker(socket, request);
              
                // Process each requested item 
                _.forEach(_request.getReferents(), function(item){
                  broker.processRequest(item);
                });
              });
            
            }else{
              // Warn about invalid item
              LOGGER.log('warn', 'unable to build initial item from the openurl passed: ' + data.toString() + ' !')
      
              var err = new Item('error', false, {'level':'error','message':CONFIGS['message']['broker_bad_item_message']});
              socket.emit(serializer.itemToJsonForClient('cedilla', err));
            }
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

    // -------------------------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------------------------
    function buildInitialItemsFromOpenUrl(queryString, callback){
      var qs = helper.queryStringToMap(queryString);

      // Toss any parameters that had a blank value!
      _.forEach(qs, function(v, k){
        if(v == ''){
          delete qs[k];
        }
      });

      var translator = new Translator('openurl');
      
      // Translate the openUrl keys to ones usable by our items
      var map = translator.translateMap(qs, false);
      LOGGER.log('debug', 'translated flat map: ' + JSON.stringify(map));
      
      // Create an item hierarchy based on the FLAT openUrl
      var item = helper.flattenedMapToItem('citation', true, map);
      LOGGER.log('debug', 'item before specialization: ' + JSON.stringify(item));
      
      // Capture all of the unmappable information and pass it back in the callback for processing
      var unmappable = {};
      
      _.forEach(map, function(value, key){
        if(!wasMapped(item, key)){
          unmappable[key] = value;
        }
      });

      callback(item, unmappable);
    }

    // -------------------------------------------------------------------------------------------
    function processUnmappedInformation(request, unmappedItems, item){
      var unmapped = "";
      
      _.forEach(unmappedItems, function(value, key){
        // If a consortial affiliation was passed in, assign it!
        if(key == CONFIGS['application']['openurl_client_affiliation']){
          request.getRequestor().setAffiliation(value);
          
        }else{
          unmapped += key + '=' + value + '&';
        }  
      });

      if(unmapped.length > 0){ unmapped = unmapped.slice(0, -1); }
      
      request.setUnmapped(unmapped.replace('"', '\\"'));
    }
    
    // -------------------------------------------------------------------------------------------
    function wasMapped(item, key){
      if(typeof item.getAttribute(key) == 'undefined'){
        unmapped = false;
        
        // Make sure its not mapped to one of the child items
        _.forEach(CONFIGS['data']['objects'][item.getType()]['children'], function(child){
          _.forEach(item.getAttribute(child + 's'), function(kid){
            unmapped = wasMapped(kid, key);
          });
        });
        
        return unmapped;
        
      }else{
        return true;
      }
    }
  }
});
