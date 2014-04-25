## Cedilla Delivery Aggregator

### Overview

The Cedilla Delivery Aggregator system is a component of the larger Cedilla project. 

#### Who is it for?

The Cedilla Project is designed for libraries (the kind with books, not code) that want to expose resources from multiple catalogs through one common delivery mechanism.

It is perhaps best explained through an example:
  If you sent a request for "A Tale of Two Cities" by Charles Dickens to Cedilla, the aggregator would first examine its registered services to determine which ones can provide information about manuscripts/books. It would then send a request to each of those services and wait for their responses. The responses coming back will either enhance the original citation (e.g. supply an ISBN or cover artwork), provide a link to an electronic copy of the item, or a call number and local library catalog information. 

Although Cedilla is geared towards libraries, all of the service registrations, data model structures, and business rules are stored in YAML configuration files. This means that with just a little bit of work anyone interested in consuming HTTP requests from a client and passing that request along to other services via standardized JSON Data Models could make use of the Cedilla Aggregator.
  
#### So how does it work?

The Aggregator is written in node.js and makes use of the socket.io module to handle open-ended connections with clients (web sockets, long polling, etc.). It also takes advantage of node's asynchronous nature to translate incoming client requests and call out to multiple services simultaneously.

When a request comes in from the client it can be in either the OpenURL format or as JSON. The aggregator first coverts the incoming request into objects and then uses the services.yaml and rules.yaml configuration files to determine what services can respond to the request. If a service is capable of responding but the aggregator does not have enough information at the moment, it places that service into a holding queue. If another service provides the information that the service in the holding queue required, the aggregator will dispatch that service as soon as it receives the information. As information comes back from the services it sends the client messages via its socket.io connection.

#### How does the Aggregator fit into the larger Cedilla project?

The Cedilla Delivery Aggregator acts as the liason between the client and any number of services. Its primary function is to interpret a client's request and then send that request along to the services that could possibly fulfill the request.

```
 -------------       ---------------                                ----------------------
|             |     |               |   HTTP    -------------      |                      |
|   client    |<--->|  Cedilla JS   |<-------->|  socket.io  |<--->|  Cedilla Aggregator  |
|             |     |               |           -------------      |                      |
 -------------       ---------------                                ----------------------
                                                                              ^
                                                                              |
                                                                         HTTP | 
			            													  |
                                                                              |
                                                                    -----------------------
                                                                   |                       |
												 			       |                       |
																   V                       V
															 ---------------	   ----------------
														    |               |     |                |
															|    Service    |     |     Service    |
															|               |     |                |
															 ---------------       ----------------
																   ^                       ^
																   |                       |
																   | HTTP                  |  IO
																   |                       |
																   V                       V
															 ---------------        ----------------
															|    endpoint   |      |    endpoint    |
															 ---------------        ----------------
```

#### Acknowledgements

The Cedilla Project was influenced by the Umlaut project: https://github.com/team-umlaut/umlaut


### Installation:

* install the latest version of node from: http://nodejs.org/

* clone this repository

* make a new directory to store your local configuration files

* copy the *.example files from /config into this new directory

* rename the copied files so that they are .yaml instead of .example

* create symbolic links in /config for each of the example files in your new directory 

* cd into the local project

* > npm install socket.io

* > npm install js-yaml

* > npm install collections

* > npm install node-html-encoder

* > npm install node-uuid

* > npm install underscore

* > npm install mocha (needs to be installed globally as well)

* > node cedilla.js

* cd out of the project

* clone the ruby based services from: https://github.com/briri/test_socket_node_ruby into a new project

* cd into that project

* > bundle install

* > thin -R config.ru start

* Pull up the node target in a browser: http://localhost:3005 

The node server takes in a request via the browser and establishes a socket.io link back to the client (e.g. websockets, ajax long polling, whatever the client can handle) and then dispatches out to the 2 sample ruby services that are listening on port 3000. As the services respond, the result is posted back to the client via the original socket.io connection.

### Wiki

The Wiki contains detailed information about the Delivery Aggregator and its components

