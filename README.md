## Cedilla

### Overview

Cedilla is a delivery aggregation system. It receives stardardized requests from various client applications and in turn transforms that incoming request into separate calls to various services.  

#### Build Status:
[![Build Status](https://secure.travis-ci.org/cdlib/cedilla.png)](http://travis-ci.org/cdlib/cedilla)

#### Who is it for?

The Cedilla Project is designed for libraries (the kind that used to have card catalogs, not code) that want to expose resources from multiple catalogs through one common delivery mechanism.

It is perhaps best explained through an example:
  If you sent a request for "A Tale of Two Cities" by Charles Dickens to Cedilla, the system would first examine its list of registered services to determine which ones can provide information about manuscripts/books. It would then send a request to each of those services and wait for their responses. The responses coming back will either enhance the original citation (e.g. supply an ISBN or cover artwork), provide a link to an electronic copy of the item, or a call number and local library catalog information. 

Although Cedilla is geared towards libraries, all of the service registrations, data model structures, and business rules are stored in YAML configuration files. This means that with just a little bit of work anyone interested in consuming HTTP requests from a client and passing that request along to other services via standardized JSON Data Models could use the Cedilla code base.
  
#### So how does it work?

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

Cedilla is written in node.js and makes use of the socket.io module to handle open-ended connections with clients (web sockets, long polling, etc.). It also takes advantage of node's asynchronous nature to translate incoming client requests and call out to multiple services simultaneously.

When a request comes in from the client it must be in the OpenURL format (JSON, MARC, XML, RDF coming soon). Cedilla coverts the incoming request into objects and then uses its services.yaml and rules.yaml configuration files to determine what services can respond to the request. If a service is capable of responding to the request type but Cedilla doesn't quite have enough information to make an optimal search against that service (e.g. an ISBN would be ideal but all we have are a title, author, and Oclc Number), it places that service into a holding queue. If another service provides the information that the service in the holding queue required, then Cedilla will dispatch that service as soon as it receives the information. As information comes back from the various services, Cedilla examines the information it has already passed back to the client in an attempt to prevent duplicate information from reaching the client.

Cedilla has no front end, and it does not include any service endpoints. This was done by design and we feel it makes the system more flexible. You can  install the components from the list below to add canned front ends and services to yoour implementation of Cedilla or you can write your own using the documentation of the standard JSON interfaces outlined in the Wiki.  

* Simple Web Client - https://github.com/cdlib/cedilla_web A very basic web site meant to get you up and running and able to test quickly.

* Cedilla Service Suite (Ruby based) - https://github.com/cdlib/cedilla_services A collection of services in one project. Each of the services can be deployed and run independently on different ports or on different servers. Currently contains services for: Internet Archive, SFX, Oclc Xid, CoverThing, and the beta Worldcat Discovery API

* Cedilla Local Holdings Service (Java based) - https://github.com/cdlib/cedilla_holdings_circ An implementation of a service that communicates with Oclc's Availability Query (AQ) service.

* Cedilla Service Gem (Ruby gem used by the Service Suite above) - https://github.com/cdlib/cedilla_ruby A ruby gem that handles the bulk of the code needed to marshal/unmarshal JSON to/from Cedilla. It allows you to focus all of your attention on simply parsing the respoonse from your service.

If you have a service that you've implemented for Cedilla, please consider sharing it with the rest of the community by sending us a link to your repository or adding it onto a forked copy of one of the above projects and send us a pull request.

#### Acknowledgements

The Cedilla Project was influenced by the great work done over at the Umlaut project: https://github.com/team-umlaut/umlaut


### Installation:

* install the latest version of node from: http://nodejs.org/

* clone this repository

* within the project directory

* > npm install

* within the project/config directory rename the *.example files to .yaml

* cd out of the project

* clone the ruby based services from: https://github.com/briri/test_socket_node_ruby into a new project

* cd into that project

* > bundle install

* > thin -R config.ru start

* Pull up the node target in a browser: http://localhost:3005 

The node server takes in a request via the browser and establishes a socket.io link back to the client (e.g. websockets, ajax long polling, whatever the client can handle) and then dispatches out to the 2 sample ruby services that are listening on port 3000. As the services respond, the result is posted back to the client via the original socket.io connection.

### Testing

* > npm test

* alternatively, install mocha globally (npm install -g mocha) and run mocha from project root

### Wiki

The Wiki contains detailed information about the Delivery Aggregator and its components

