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
  var query = url.parse(request.url).query,
      id = uuid.v4();
  
  log.debug({object: 'router.js', target: '/citation', openurl: query, request_id: id}, 'Received request to translate openUrl to citation.');

  var parser = new OpenUrlParser(query);

  parser.buildItemsFromQueryString(query, function(item, leftovers){
    var hash = helper.itemToMap(item);
    
    log.debug({object: 'router.js', target: '/citation', requested_citation: hash, request_id: id}, 'Transformed OpenUrl into Citation');
    
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    response.writeHead(200);
    response.end(JSON.stringify(hash));    
  });
});

module.exports = router;