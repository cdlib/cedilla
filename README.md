## Cedilla Delivery Aggregator

### Overview

The Cedilla Delivery Aggregator system is a component of the larger Cedilla project. It acts as a middleman between the (Cedilla JS Library)[https://github.com/cdlib/cedilla_web] and various (Cedilla Service)[https://github.com/cdlib/cedilla_services] implementations.

The Aggregator is written in node.js and makes use of the socket.io module to handle open-ended connections with clients (web sockets, long polling, etc.). It also takes advantage of node's asynchronous nature to translate incoming client requests and call out to multiple services simultaneously.

#### How does the Aggregator fit into the larger Cedilla project?

- The client web application makes a call to the Cedilla Aggregator via the Cedilla JS library. 
- The JS library establishes a socket.io connection with the Aggregator and passes along the client's request. Socket.io determines whether it will be using websockets, long polling, flash, etc. based on the client's browser's capabilities. 
- When the Aggregator receives the request it checks its local rules and policies to determine which services can possibly fullfill the request. 
- The Aggregator then makes asynchronous calls to each of the services and sends results back to the client application as the services begin to respond. 

Note that the Cedilla Services can be written in any language and can communicate with any endpoint whether its a remote website like the Internet Archive, a local database, or a spreadsheet.

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
 

### Installation:

* install the latest version of node from: http://nodejs.org/

* clone this repository

* make a new directory to store your local configuration files

* copy the *.example files from /config into this new directory

* rename the copied files so that they are .yaml instead of .example

* create symbolic links in /config for each of the example files in your new directory 

* cd into the local repo

* > npm install socket.io

* > npm install js-yaml

* > npm install collections

* > node cedilla.js

* cd out of the repo

* clone the ruby based services from: https://github.com/briri/test_socket_node_ruby into a new repo

* cd into that repo

* > bundle install

* > thin -R config.ru start

* Pull up the node target in a browser: http://localhost:3005 

The node server takes in a request via the browser and establishes a socket.io link back to the client (e.g. websockets, ajax long polling, whatever the client can handle) and then dispatches out to the 2 sample ruby services that are listening on port 3000. As the services respond, the result is posted back to the client via the original socket.io connection.

