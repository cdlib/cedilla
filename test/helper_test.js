var assert = require("assert"),
		_ = require('underscore'),
		helper = require("../lib/helper.js");
		
describe("helper.js", function(){
	var configManager = undefined,
			messages = undefined;
	
	// ---------------------------------------------------------------------------------------------------
	before(function(done){
		configManager = require("../config/config.js")
		
		// Call the configManager for the first time so that the yaml files get loaded
		configManager.getConfig('message', function(config){	
			messages = config;	
			done();
		});
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('testing queryStringToMap()', function(){
		var answer = {"foo":"bar", "my":"my new map", "child":"two"};
		var qs = "foo=bar&my=my%20new%20map&child=one&child=two";
		
		//console.log(map);
		// We're unable to interpret parent-child relationships in a queryString therefore the above child=one&child=two
		// will result in "child":"two"
		assert.equal(_.size(answer), _.size(helper.queryStringToMap(qs)));
		
		assert.equal(0, _.size(helper.queryStringToMap("?")));
		assert.equal(0, _.size(helper.queryStringToMap("")));
		assert.equal(0, _.size(helper.queryStringToMap(undefined)));
		assert.equal(0, _.size(helper.queryStringToMap(13)));
	});

	// ---------------------------------------------------------------------------------------------------
	it('testing mapToQueryString()', function(){
		var map = {"foo":"bar", "my":"my new map", "children":[{"child":"one"}, {"child":"two"}]};
		
		var answer = "foo=bar&my=my%20new%20map&child=one&child=two";
		
		assert.equal(answer, helper.mapToQueryString(map));
		
		map = {};
		assert.equal("", helper.mapToQueryString(map));
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('testing safeAssign()', function(){
	
		// Make sure the default is assigned if the value is missing
		assert.equal('default', helper.safeAssign('string', undefined, 'default'));
		assert.equal('default', helper.safeAssign('string', null, 'default'));
		assert.equal('default', helper.safeAssign('string', '  ', 'default'));

		// Make sure the default is assigned if the data type and value mismatch
		assert.equal(false, helper.safeAssign('boolean', 'tester', false));
		assert.equal(0, helper.safeAssign('integer', 'foo', 0));
		assert.equal(0, helper.safeAssign('double', 'bar', 0));
		
		// valid assignments
		assert.equal('foo', helper.safeAssign('string', 'foo', 'default'));
		assert(helper.safeAssign('boolean', 'true', false));
		assert(helper.safeAssign('boolean', true, false));
		assert.equal(13, helper.safeAssign('integer', '13', 0));
		assert.equal(13, helper.safeAssign('integer', 13, 0));
		assert.equal(13.5, helper.safeAssign('double', '13.5', 0));
		assert.equal(13.5, helper.safeAssign('double', 13.5, 0));
		assert.equal('13.5', helper.safeAssign('string', 13.5, '0'));
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('testing buildMessage()', function(){
		_.forEach(messages, function(value, key){
			var tmp = value,
					vals = [];
			
			while(tmp.indexOf('?') >= 0){
				tmp = tmp.replace('?', "'foo_" + _.size(vals) + "'");
				vals.push("foo_" + _.size(vals));
			}
			
			assert.equal(tmp, helper.buildMessage(value, vals));
		});
	});
	
	// ---------------------------------------------------------------------------------------------------
	it('testing depluralize()', function(){
		assert.equal('citation', helper.depluralize('citations'));
		assert.equal('camel', helper.depluralize('camels'));
		assert.equal('city', helper.depluralize('cities'));
		assert.equal('base', helper.depluralize('bases'));
		assert.equal('locus', helper.depluralize('loci'));
		
		assert.notEqual('targets', helper.depluralize('targets'));
		
		// Depluralize is super basic, it does not currently handle these items
		assert.notEqual('mouse', helper.depluralize('mice'));
		assert.notEqual('goose', helper.depluralize('geese'));
	});
});