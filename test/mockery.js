var net = require('http'),
		url = require('url');
		
module.exports = {
	// ----------------------------------------------------------------------------------------------
	// Mock external service for testing
	// ----------------------------------------------------------------------------------------------
	spinUpServer: function(returnField, returnValue){
		mockService = net.createServer(function(request, response){
			var now = new Date(),
					body = '',
					bodyLen = 0,
					json = undefined;

			// Do routing 
			// ----------------------------------------------------------------------------------------------
			var route = url.parse(request.url).pathname;
					
			// Deal with timeouts
			// ----------------------------------------------------------------------------------------------
			var timeout = (route == '/timeout' ? 1 : 20000);
		
			request.setTimeout(timeout, function(){
				console.log('timeout while trying to connect to ' + self._name);
			});
		
			// Chunk up the data coming through in the request - kill it if it its too much
			// ----------------------------------------------------------------------------------------------
			request.on('data', function(data){ 
			
				if(body.length > 10000){
					request.abort();
					console.log('incoming request is too large ... aborting call.');
					console.log(data);
				
				}else{
					body += data;
				}
			 
			});
		
			// Send back the appropriate response based on the route
			// ----------------------------------------------------------------------------------------------
			request.on('end', function(){ 
				//response.writeHead(404);
			
				var json = JSON.parse(body);
				
				if(route == '/success'){
					response.writeHead(200);
					response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
																json.api_ver + "\",\"citations\":[{\"" + returnField + "\":\"" + returnValue + "\"}]}");
			
				}else if(route == '/wrong_id'){
					response.writeHead(200);
					response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"ABCD-1234\",\"api_ver\":\"" + 
																json.api_ver + "\",\"citations\":[{\"" + returnField + "\":\"" + returnValue + "\"}]}");
			
				}else if(route == '/bad_request'){
					response.writeHead(400);
					response.end();
				
				}else if(route == '/not_found'){
					response.writeHead(404);
					response.end();
															
				}else if(route == '/warning' ){
					response.writeHead(500);
					response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
																json.api_ver + "\",\"error\":{\"message\":\"foobar\",\"level\":\"warning\"}}");
			
				}else if(route == '/error'){
					response.writeHead(500);
					response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
																json.api_ver + "\",\"error\":{\"message\":\"foobar\",\"level\":\"error\"}}");
			
				}else if(route == '/fatal'){
					response.writeHead(500);
					response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
																json.api_ver + "\",\"error\":{\"message\":\"foobar\",\"level\":\"fatal\"}}");
															
				}else if(route == '/timeout'){				
	//				setTimeout(function(){
						response.writeHead(200);
		//			}, 50);
			
				}else if(route == '/unknown_item'){
					response.writeHead(200);
					response.end("{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
																json.api_ver + "\",\"examples\":[{\"" + returnField + "\":\"" + returnValue + "\"}]}");
															
				}else if(route == '/not_json'){
					response.writeHead(200);
					response.end("<html><head><title>test</title></head><body><div>Hello Tester!</div></body></html>");
			
				}else if(route == '/flood_buffer'){
					response.writeHead(200);
					var msg = "{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" + 
																json.api_ver + "\",\"citations\":[";
															
					for(var i = 0; i < CONFIGS['application']['service_max_response_length'] + 1; i++){
						msg += "{\"genre\":\"bar\",\"content_type\":\"foo\",\"isbn\":\"" + i + "\"}";
					}
				
					response.end(msg + "]}");
			
				}else{
					// Generic server error
					response.writeHead(500);
				}
			
			});
		
		});
	
		mockService.listen(9000);
		console.log('spun up mock server on 9000');
	
		return mockService;
	}
	
}