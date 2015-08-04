/**
 * cdla_generator.js
 * author: Joe Ferrie
 * creation date: 06/15/2015
 *
 * This is a generator for the websocket.bench tool
 * It captures the time from request to
 * receipt of the resource and complete events for each request
 * and writes the results to a file.
 */
  
var fs = require('fs');
var qry = fs.readFileSync('./~qry');

module.exports = {

  /**
   * On client connection (required)
   * @param {client} client connection
   * @param {done} callback function(err) {}
   */
  onConnect: function(client, done) {
    client.emit('openurl', "cedilla:affiliation=ucb&" + qry);
    console.log("emitted event ", "cedilla:affiliation=ucb&" + qry);
    var start = new Date().getTime();

    client.on('resource', function() {
      var resource_finish = new Date().getTime();
      var resource_result = (resource_finish - start).toString();
      console.log("resource event received " + resource_result);
      fs.appendFileSync("wb_result.csv", resource_result + ",");
    });

    client.on('complete', function() {
      var complete_finish = new Date().getTime();
      var complete_result = (complete_finish - start).toString();
      console.log("complete event received " + complete_result);
      fs.appendFileSync("wb_result.csv", complete_result + "\n");
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
