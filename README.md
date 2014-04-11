## Cedilla Delivery Aggregator

### Overview

The Cedilla Delivery Aggregator system is a component of the larger Cedilla project. It acts as a middleman between the (Cedilla JS Library)[https://github.com/cdlib/cedilla_web] and various (Cedilla Service)[https://github.com/cdlib/cedilla_services] implementations.

The Aggregator is written in node.js and makes use of the socket.io module to handle open-ended connections with clients (web sockets, long polling, etc.). It also takes advantage of node's asynchronous nature to translate incoming client requests and call out to multiple services simultaneously.


```
 -------------       ----------------------                                ----------------------
|             |     |                      |   HTTP    -------------      |                      |
|   client    |<--->|  Cedilla JS library  |<-------->|  socket.io  |<--->|  Cedilla Aggregator  |
|             |     |                      |           -------------      |                      |
 -------------       ----------------------                                ----------------------
                                                                                     ^
                                                                                     |
                                                                                HTTP | 
																					 |
                                                                                     |
                                                                           -----------------------
                                                                          |                       |
																		  |                       |
																		  V                       V
																	---------------	      ----------------
																   |               |     |                |
																   |    Service    |     |     Service    |
																   |               |     |                |
																    ---------------       ----------------
																	      ^                       ^
																	      |                       |
																		  | HTTP                  |  IO
																		  |                       |
																		  V                       V
																     ---------------      ----------------
																	|    endpoint   |    |    endpoint    |
																	 ---------------      ----------------
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

