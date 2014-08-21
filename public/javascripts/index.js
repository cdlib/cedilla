var socket = io.connect(host);

socket.on('citation', function (data) {
	$("#citation #first").after(formatHash('', JSON.parse(data)));
});

socket.on('resource', function (data) {
  $("#resource #first").after(formatHash('', JSON.parse(data)));
});

socket.on('error', function (data) {
	$("#state").html('Received an error! See message below in red.');
  $("#citation #first").after('<div style="color: red; ">' + formatHash('', JSON.parse(data)) + '</div>');
});

socket.on('complete', function (data) {
	$("#state").html('All services have responded');
});

// -----------------------------------------------------------------------
$("#post-openurl").click(function(){
	var openurl = $("#openurl").val();
	
	$("#state").html('Calling Cedilla');
	
	// Make the call to the Citation Webservice to see if the OpenUrl was properly translated
	$.getJSON(host + "/citation?" + openurl, function(data){
		$("#initial").html(buildDisplay(data));
	});
	
	$("#citation").html('<div id="first"></div>');
	$("#resource").html('<div id="first"></div>');
	
	$("#state").html('Received Initial Citation Interpretation.');
	
	// Send the openurl to Cedilla
	socket.emit('openurl', openurl);
	
	$("#state").html('Calling Cedilla\'s Services');
});

// -----------------------------------------------------------------------
function formatKeyValue(key, val){
	return '<div class="data"><label>' + key + ':</label> ' + val + '</div>';
}
// -----------------------------------------------------------------------
function formatHash(label, hash){
	ret = '<div>';
	
	$.each(hash, function(key, value){
		if(value instanceof Array){
			ret += formatArray(key, value);
			
		}else if(typeof value != 'string'){
			ret += formatHash(key, value);
			
		}else{
			ret += formatKeyValue(key, value);
		}
	});
	
	return ret + '</div>';
}
// -----------------------------------------------------------------------
function formatArray(label, array){
	ret = '<div class="group"><label>' + label + ':</label><ul>';
	
	$.each(array, function(idx, item){
		ret += '<li>';
		
		if(typeof item == 'string'){
			ret += item;
		}else{
			ret += formatHash('', item);
		}
		
		ret += '</li>';
	})
	
	return ret + '</ul></div>';
}

// -----------------------------------------------------------------------
function buildDisplay(data){
	var ret = '';
	
	$.each(data, function(key, val){
		if(val instanceof Array){
			ret += '<div class="group"><label>' + key + ':</label><ul>';
			
			$.each(val, function(idx, item){
				ret += '<li>';
				$.each(item, function(k, v){
					ret += formatKeyValue(k, v);
				});
				ret += '</li>';
			});
			
			ret += '</ul></div>';
			
		}else if(typeof val != 'string'){
			ret += '<div class="group"><label>' + key + ':</label>';
			
			$.each(val, function(k, v){
				ret += buildDisplay(v); //formatKeyValue(k, v);
			});
			ret += '</div>';
			
		}else{
			ret += formatKeyValue(key, val);
		}
	});
	
	return ret;
}

