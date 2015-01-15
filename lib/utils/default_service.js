"use strict";

var _ = require('underscore');
var url = require('url');

var CONFIGS = require("../config.js");
var helper = require("../utils/helper.js");
var configHelper = require("../utils/config_helper.js");
var Item = require("../models/item.js");


module.exports = {
  startDefaultService: function() {
    var net = require('http');

    var mockService = net.createServer(function(request, response) {
      var body = '';

      // Do routing 
      // ----------------------------------------------------------------------------------------------
      var route = url.parse(request.url).pathname;

      // Chunk up the data coming through in the request - kill it if it its too much
      // ----------------------------------------------------------------------------------------------
      request.on('data', function(data) {
        body += data;
      });

      // Send back the appropriate response based on the route
      // ----------------------------------------------------------------------------------------------
      request.on('end', function() {
        var json = JSON.parse(body),
                now = new Date();

        if (route === '/default') {
          response.writeHead(200);

          var buildItem = function(type) {
            var params = {};

            _.forEach(CONFIGS.data.objects[type].attributes, function(attribute) {
              params[attribute] = 'example';
            });

            return new Item(type, true, params);
          };

          var item = buildItem(configHelper.getRootItemType());

          _.forEach(CONFIGS.data.objects[configHelper.getRootItemType()].children, function(child) {
            item.addAttribute(child + 's', [buildItem(child)]);
          });

          var ret = "{\"time\":\"" + now.toJSON() + "\",\"id\":\"" + json.id + "\",\"api_ver\":\"" +
                  json.api_ver + "\",\"" + configHelper.getRootItemType() + "s\":[" + JSON.stringify(helper.itemToMap(item)) + "]}";

          response.end(ret);

        } else {
          response.writeHead(404);
          response.end();
        }

      });

    });

    mockService.listen(9900);
    console.log('spun up default service on port 9900 - update your config/application.yaml to turn this service off!');

    return mockService;
  }
};