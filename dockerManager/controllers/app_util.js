
var http = require('http');
var fs = require("fs");

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
	  });

	  res.on("end", function(){
	  	callback(  inspectData, res.statusCode, null);

	  });


	});

	req.on('error', function(e) {
	  inspectData = "";
	  console.log('problem with request: ' + e.message);
	  callback( null, null, e.message);

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
	  });

	  res.on("end", function(){
	  	callback(  inspectData, res.statusCode, null);
	  });


	});

	req.on('error', function(e) {
	  inspectData = "";
	  console.log('problem with request: ' + e.message);
	  callback( null, null, e.message);

	});

	req.end();


}



exports.makeFileUploadRequest = function( filePath, queryString, onResult){
	console.log("called makeFileUploadRequest");


	var dockerResponse = {}; 
	var options = {
	  hostname: '192.168.0.231',
	  port: 4273,
	  path: queryString,
	  method: 'POST'
	};

	console.log( queryString);
	var req = http.request(options, function(res) {
	  console.log('STATUS: ' + res.statusCode);
	  console.log('HEADERS: ' + JSON.stringify(res.headers));
	  res.setEncoding('utf8');
	  res.on('data', function (chunk) {
	  	 dockerResponse.message += (chunk);
	  });

	  res.on("end", function(){
	  	onResult(  dockerResponse, res.statusCode, null);

	  });


	});

	req.setHeader("Content-Type", "application/tar");


	req.on('error', function(e) {
	  console.log('problem with request: ' + e.message);
	  onResult( null, null, e.message);

	});


	  fs.createReadStream(filePath).on("data" ,function(data){
	  	req.write(data);

	  }).on("end", function(){

	  	req.end();
	  });
	
	
}




exports.makePostRequest = function(queryString, callback){

	var inspectData = ""; 
	var options = {
	  hostname: '192.168.0.231',
	  port: 4273,
	  path: queryString,
	  method: 'POST'
	};

	console.log( queryString);
	var req = http.request(options, function(res) {
	  console.log('STATUS: ' + res.statusCode);
	  console.log('HEADERS: ' + JSON.stringify(res.headers));
	  res.setEncoding('utf8');
	  res.on('data', function (chunk) {
	  	 inspectData += (chunk);
	  });

	  res.on("end", function(){
	  	console.log( "BODY", inspectData);
	  	callback(  inspectData, res.statusCode, null);

	  });


	});

	req.on('error', function(e) {
	  inspectData = "";
	  console.log('problem with request: ' + e.message);
	  callback( null, null, e.message);

	});

	req.end();


}
