var express = require('express');

var router = express.Router();

// ----------------------------------------------------------------------------------------
router.get('/', function(request, response, next){
	var host = 'http://' + request.hostname + ':' + CONFIGS['application']['port'];
	
	var data = {title: 'Cedilla - Test Page',
							host: host};
							
	response.render('index', data);
														
	next();
});

// ----------------------------------------------------------------------------------------
router.get('/citation', function(request, response, next){
  var query = url.parse(request.url).query;
  LOGGER.log('debug', 'parsed query into key/value array: ' + JSON.stringify(query));

	var parser = new OpenUrlParser(query);

	parser.buildItemsFromQueryString(query, function(item, leftovers){
    LOGGER.log('debug', 'built item: ' + JSON.stringify(helper.itemToMap(item)));

    response.setHeader('Content-Type', 'application/json');
    response.writeHead(200);
    response.end(JSON.stringify(helper.itemToMap(item)));    
	});
});

module.exports = router;