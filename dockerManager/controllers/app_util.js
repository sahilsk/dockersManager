var http = require('http');
var fs = require('fs');
var ping = require('ping');
var util = require('util');

var config = require('../config/config');
var logger = require("../config/logger");






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


exports.makeFileUploadRequestToHost = function (host, filePath, queryString, onResult) {

  var dockerResponse = {};
  var options = {
      hostname: host.ip,
      port: host.port,
      path: queryString,
      method: 'POST'
    };

  logger.info("Dispatching dockerfile to : " + JSON.stringify(options) );
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

exports.makePostRequestToHost = function (host, queryString, headers, requestBody,  callback) {
  var inspectData = '';
  
  var options = {
      hostname: host.ip,
      port: host.port,
      path: queryString,
      method: 'POST'
  };
  

  if(headers) options.headers = headers;

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

  if( requestBody) req.write(requestBody);
  req.end();
};


exports.makePostRequest = function (queryString, headers, body,  callback) {
  var inspectData = '';
  
  var options = {
      hostname: config.docker.hostname,
      port: config.docker.port,
      path: queryString,
      method: 'POST'
  };
  

  if(headers) options.headers = headers;

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

  if( body) req.write(body);
  req.end();
};


exports.isHostAlive =  function(hostAddress, callback){

    ping.sys.probe(hostAddress, function(isAlive){ 
      callback(isAlive);     
    });  

}


exports.isDockerServerAlive = function( dockerHost, dockerPort, callback){

  var options = {
      hostname: dockerHost,
      port: dockerPort,
      path: "/version",
      method: 'GET'
    };

  var isAlive = false;
  console.log( "Checking Docker host - <" + dockerHost + ">:<" + dockerPort +">");
  
  var req = http.request(options, function (res) {
      var statusCode = res.statusCode;
      var error = null;
      var resposeBody = "";
      logger.info('STATUS: ' + statusCode);
      logger.info('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      if( statusCode === 200){
        logger.info("Docker Server %s:%s is alive. [StatusCode: %d]",  dockerHost, dockerPort, statusCode);
        isAlive =true;
      }else if(statusCode === 500){
        logger.info("Docker Server %s:%s has an issue. [StatusCode: %d]",  dockerHost, dockerPort, statusCode);
        error = "Docker Server(" + dockerHost+ ":" + dockerPort+  ") error";
        isAlive = null;
      }else{
         logger.info("Unable to reach Server %s:%s. [StatusCode: %d]",  dockerHost, dockerPort, statusCode);
         isAlive = false;
         error = "Unable to reach Docker Server(" + dockerHost + ":" + dockerPort+  ") ";
      }

      res.on('data', function (chunk) {
        resposeBody += chunk;
      });


      res.on('end', function(){
        logger.info("===========Ending response : %s:%s" , isAlive, error? error:"SUCCESS");
        callback(isAlive, error );
      });

  });

  req.on('error', function (e) {
    logger.error('Problem with request to %s:%s. Verify server address is valid: %s', dockerHost, dockerPort , e.message);
    callback(isAlive, e.message);
  });

  req.end();

}


exports.isServerFullyLoaded = function(server, callback){
    callback(true);
}