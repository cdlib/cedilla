/**
 * cdla_generator.js
 * author: Joe Ferrie
 * creation date: 06/15/2015
 *
 * This is a generator for the websocket.bench tool
 * It captures the time from request to
 * receipt of the complete event for each request
 * and writes the results to a file.
 */
  
var count = 0;
var fs = require('fs');

module.exports = {

  /**
   * Before connection (optional, just for faye)
   * @param {client} client connection
   */
  beforeConnect: function(client) {
    // Example:
    // client.setHeader('Authorization', 'OAuth abcd-1234');
    // client.disable('websocket');
  },

  /**
   * On client connection (required)
   * @param {client} client connection
   * @param {done} callback function(err) {}
   */
  onConnect: function(client, done) {
    client.emit('openurl', "cedilla:affiliation=ucb&genre=article&issn=1350231X&title=Journal%20of%20Brand%20Management&volume=11&issue=1&date=20030901&atitle=Ad%20spending%20on%20brand%20extensions:%20does%20similarity%20matter%3F&spage=63&sid=EBSCO:cax&pid=");
    var start = new Date().getTime();
    client.on('complete', function() {
      var finish = new Date().getTime();
      var result = (finish - start).toString();
      count = count + 1
      console.log(count + " complete event received " + (finish - start));
      fs.appendFile("result.txt", result + "\n");
    });
    done();
  },

  /**
   * Send a message (required)
   * @param {client} client connection
   * @param {done} callback function(err) {}
   */
  sendMessage: function(client, done) {
  },
  
};
