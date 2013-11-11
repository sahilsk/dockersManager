
var http = require('http');

exports.makeGetRequest = function(queryString, callback){

	var inspectData = ""; 
	var options = {
	  hostname: '192.168.0.231',
	  port: 4273,
	  path: queryString,
	  method: 'GET'
	};

	console.log( queryString);
	var req = http.request(options, function(res) {
	  console.log('STATUS: ' + res.statusCode);
	  console.log('HEADERS: ' + JSON.stringify(res.headers));
	  res.setEncoding('utf8');
	  res.on('data', function (chunk) {
	  	 inspectData += (chunk);

	   // console.log('BODY: ' + inspectData);
	   // callback( inspectData.toString(), res.statusCode);

	  });

	  res.on("end", function(){
	  //	var data =   JSON.parse( inspectData);
	  //	console.log( data);
	  	callback(  inspectData, res.statusCode);

	  });


	});

	req.on('error', function(e) {
	  inspectData = "";
	  console.log('problem with request: ' + e.message);
	  callback( null, null);

	});

	req.end();


}



exports.makeDELETERequest = function(queryString, callback){
	console.log("called delete");


	var inspectData = ""; 
	var options = {
	  hostname: '192.168.0.231',
	  port: 4273,
	  path: queryString,
	  method: 'DELETE'
	};

	console.log( queryString);
	var req = http.request(options, function(res) {
	  console.log('STATUS: ' + res.statusCode);
	  console.log('HEADERS: ' + JSON.stringify(res.headers));
	  res.setEncoding('utf8');
	  res.on('data', function (chunk) {
	  	 inspectData += (chunk);

	   // console.log('BODY: ' + inspectData);
	   // callback( inspectData.toString(), res.statusCode);

	  });

	  res.on("end", function(){
	  //	var data =   JSON.parse( inspectData);
	  //	console.log( data);
	  	callback(  inspectData, res.statusCode);

	  });


	});

	req.on('error', function(e) {
	  inspectData = "";
	  console.log('problem with request: ' + e.message);
	  callback( null, null);

	});

	req.end();


}