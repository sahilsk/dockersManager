var http = require('http');
var fs = require('fs');
var ping = require('ping');

var config = require('../config/config');
exports.makeGetRequest = function (queryString, callback) {
  var inspectData = '';
  var options = {
      hostname: config.docker.hostname,
      port: config.docker.port,
      path: queryString,
      method: 'GET'
    };
  console.log(queryString);
  var req = http.request(options, function (res) {
      console.log('STATUS: ' + res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        inspectData += chunk;
      });
      res.on('end', function () {
        callback(inspectData, res.statusCode, null);
      });
    });
  req.on('error', function (e) {
    inspectData = '';
    console.log('problem with request: ' + e.message);
    callback(null, null, e.message);
  });
  req.end();

};
exports.makeDELETERequest = function (queryString, callback) {
  console.log('called delete');
  var inspectData = '';
  var options = {
      hostname: config.docker.hostname,
      port: config.docker.port,
      path: queryString,
      method: 'DELETE'
    };
  console.log(queryString);
  var req = http.request(options, function (res) {
      console.log('STATUS: ' + res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        inspectData += chunk;
      });
      res.on('end', function () {
        callback(inspectData, res.statusCode, null);
      });
    });
  req.on('error', function (e) {
    inspectData = '';
    console.log('problem with request: ' + e.message);
    callback(null, null, e.message);
  });
  req.end();
};
exports.makeFileUploadRequest = function (filePath, queryString, onResult) {
  console.log('called makeFileUploadRequest');
  var dockerResponse = {};
  var options = {
      hostname: config.docker.hostname,
      port: config.docker.port,
      path: queryString,
      method: 'POST'
    };
  console.log(queryString);
  var req = http.request(options, function (res) {
      console.log('STATUS: ' + res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        dockerResponse.message += chunk;
      });
      res.on('end', function () {
        onResult(dockerResponse, res.statusCode, null);
      });
  });
  req.setHeader('Content-Type', 'application/tar');
  req.on('error', function (e) {
    console.log('problem with request: ' + e.message);
    onResult(null, null, e.message);
  });
  fs.createReadStream(filePath).on('data', function (data) {
    req.write(data);
  }).on('end', function () {
    req.end();
  });
};
exports.makePostRequest = function (queryString, headers, body,  callback) {
  var inspectData = '';
  
  var options = {
      hostname: config.docker.hostname,
      port: config.docker.port,
      path: queryString,
      method: 'POST'
  };
  

  if(headers)
    options.headers = headers;



  console.log(options);
  var req = http.request(options, function (res) {
      console.log('STATUS: ' + res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        inspectData += chunk;
      });
      res.on('end', function () {
        console.log('BODY', inspectData);
        callback(inspectData, res.statusCode, null);
      });
    });
  req.on('error', function (e) {
    inspectData = '';
    console.log('problem with request: ' + e.message);
    callback(null, null, e.message);
  });

  if( body)
      req.write(body);


  req.end();
};


exports.isHostAlive =  function(hostAddress, callback){

    ping.sys.probe(hostAddress, function(isAlive){ 
      callback(isAlive);     
    });  

}


exports.isDockerServerAlive = function( dockerHost, dockerPort, callback){

  var inspectData = '';
  var options = {
      hostname: dockerHost,
      port: dockerPort,
      path: "/version",
      method: 'GET'
    };

  console.log( "Checking Dockerhost - " + dockerHost + ":" + dockerPort );
  
  var req = http.request(options, function (res) {
      console.log('STATUS: ' + res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        inspectData += chunk;
      });
      res.on('end', function () {
        callback(inspectData, res.statusCode, null);
      });
  });
  req.on('error', function (e) {
    inspectData = '';
    console.log('problem with request: ' + e.message);
    callback(null, null, e.message);
  });
  req.end();

}