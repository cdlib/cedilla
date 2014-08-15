var socket = io.connect(host);

socket.on('citation', function (data) {
	$("#citation #first").after(buildDisplay(JSON.parse(data)));
});

socket.on('author', function (data) {
  $("#citation #first").after(buildDisplay(JSON.parse(data)));
});

socket.on('resource', function (data) {
  $("#resource #first").after(buildDisplay(JSON.parse(data)));
});

socket.on('error', function (data) {
  $("#resource #first").after(buildDisplay(JSON.parse(data)));
});

socket.on('complete', function (data) {
	
//	socket.disconnect();
});

// -----------------------------------------------------------------------
$("#post-openurl").click(function(){
	var openurl = $("#openurl").val();
	
	// Make the call to the Citation Webservice to see if the OpenUrl was properly translated
	$.getJSON(host + "/citation?" + openurl, function(data){
		$("#initial").html(buildDisplay(data));
	});
	
	$("#citation").html('<div id="first"></div>');
	$("#resource").html('<div id="first"></div>');
	
	// Send the openurl to Cedilla
	socket.emit('openurl', openurl);
});

// -----------------------------------------------------------------------
function formatKeyValue(key, val){
	return '<div class="data"><label>' + key + ':</label> ' + val + '</div>';
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
				ret += formatKeyValue(k, v);
			});
			ret += '</div>';
			
		}else{
			ret += formatKeyValue(key, val);
		}
	});
	
	return ret;
}