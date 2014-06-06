## Cedilla

### Overview

Cedilla is a delivery aggregation system. It receives stardardized requests from various client applications and in turn transforms that incoming request into separate calls to various services.  

#### Build Status:
[![Build Status](https://secure.travis-ci.org/cdlib/cedilla.png?branch=master)](http://travis-ci.org/cdlib/cedilla)

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

* start Cedilla

* > node cedilla.js

* Pull up Cedilla in a browser: http://localhost:3005 

You should see 3 responses from the default service. Your screen should display (in Google Chrome):
```
{"time":"2014-06-05T21:43:55.964Z","api_ver":"1","service":"Default Data","author":{"corporate_author":"example","full_name":"example","last_name":"example","first_name":"example","initials":"example","first_initial":"example","middle_initial":"example","suffix":"example","dates":"example","authority":"example"}}

{"time":"2014-06-05T21:43:55.964Z","api_ver":"1","service":"Default Data","resource":{"source":"example","location":"example","target":"example","local_id":"example","local_title":"example","format":"example","type":"example","catalog_target":"example","cover_image":"example","description":"example","language":"example","license":"example","rating":"example","availability":"example","status":"example"}}

{"time":"2014-06-05T21:43:55.964Z","api_ver":"1","service":"Default Data","citation":{"campus":"example","issn":"example","eissn":"example","eisbn":"example","oclc":"example","lccn":"example","doi":"example","coden":"example","sici":"example","bici":"example","document_id":"example","book_title":"example","journal_title":"example","chapter_title":"example","article_title":"example","short_title":"example","year":"example","month":"example","day":"example","volume":"example","issue":"example","article_number":"example","enumeration":"example","edition":"example","part":"example","season":"example","quarter":"example","series":"example","institution":"example","subject":"example","pages":"example","start_page":"example","end_page":"example","language":"example","abstract":"example","sample_cover_image":"example"}}

All services have responded.
```

The default service is there just to help you verify that your installation worked properly. You can turn it off by commenting out the following line in application.yaml
  > server_default_content: true

### Setting up your own services

* follow the installation instructions for the Cedilla Services project: https://github.com/cdlib/cedilla_services

* install and start your own services (instructions for rolling your own services can be found on this project's Wiki)

* update your services.yaml (make sure the 'target' is correct and that each one is enabled!)

* update the rules.yaml (make sure your service appears in the dispatch_always OR in the data --> object --> item type --> attribuute --> value section)

* see the Wiki or configuration file comments for further instructions on configuring your setup.

* restart Cedilla if it does not pick up your configuration file changes

* node cedilla.js

#####Make sure you turn off the Default Service!!

The default service is there just to help you verify that your installation worked properly. You can turn it off by commenting out the following line in application.yaml
  > server_default_content: true

### Testing

* > npm test

* alternatively, install mocha globally (npm install -g mocha) and run mocha from project root

### Wiki

The Wiki contains detailed information about configuring Cedilla, building client applications for the system, and creating services.

