//var http = require('http');
var http = require('follow-redirects').http;
var fs = require('fs');
var ping = require('ping');
var util = require('util');
var config = require('../config/config');
var logger = require('../config/logger');
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
        console.log('BODY', inspectData);
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
  var resBody = '';
  var options = {
      hostname: host.hostname,
      port: host.dockerPort,
      path: queryString,
      method: 'POST'
    };
  logger.info('Building dockerfile on ' + JSON.stringify(options));
  var req = http.request(options, function (res) {
      console.log('STATUS: ' + res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        resBody += chunk;
        logger.info(chunk);
      });
      res.on('end', function () {
        onResult(resBody, res.statusCode, null);
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
exports.makePostRequestToHost = function (host, queryString, headers, requestBody, callback) {
  var inspectData = '';
  var options = {
      hostname: host.hostname,
      port: host.dockerPort,
      path: queryString,
      method: 'POST'
    };
  if (headers)
    options.headers = headers;
  console.log(options);
  var req = http.request(options, function (res) {
      console.log('STATUS: ' + res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        logger.info(chunk);
        inspectData += chunk;
      });
      res.on('end', function () {
        console.log('BODY', inspectData);
        callback(inspectData, res.statusCode, null);
      });
    });
  req.on('error', function (e) {
    inspectData = '';
    console.log('ERROR: Problem with request: ' + e.message);
    callback(null, null, e.message);
  });
  if (requestBody)
    req.write(requestBody);
  req.end();
};
exports.makePostRequest = function (queryString, headers, body, callback) {
  var inspectData = '';
  var options = {
      hostname: config.docker.hostname,
      port: config.docker.port,
      path: queryString,
      method: 'POST'
    };
  if (headers)
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
  if (body)
    req.write(body);
  req.end();
};
exports.isHostAlive = function (hostAddress, callback) {
  ping.sys.probe(hostAddress, function (isAlive) {
    callback(isAlive);
  });
};
exports.isDockerServerAlive = function (dockerHost, dockerPort, oResult) {
  var options = {
      hostname: dockerHost,
      port: dockerPort,
      path: '/version',
      method: 'GET'
    };
  var isAlive = false;
  console.log('Checking Docker host - <' + dockerHost + '>:<' + dockerPort + '>');
  var req = http.request(options, function (res) {
      var statusCode = res.statusCode;
      var error = null;
      var resposeBody = '';
      logger.info('STATUS: ' + statusCode);
      logger.info('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      if (statusCode === 200) {
        logger.info('Docker Server %s:%s is alive. [StatusCode: %d]', dockerHost, dockerPort, statusCode);
        isAlive = true;
      } else if (statusCode === 500) {
        logger.info('Docker Server %s:%s has an issue. [StatusCode: %d]', dockerHost, dockerPort, statusCode);
        error = 'Docker Server(' + dockerHost + ':' + dockerPort + ') error';
        isAlive = null;
      } else {
        logger.info('Unable to reach Server %s:%s. [StatusCode: %d]', dockerHost, dockerPort, statusCode);
        isAlive = false;
        error = 'Unable to reach Docker Server(' + dockerHost + ':' + dockerPort + ') ';
      }
      res.on('data', function (chunk) {
        resposeBody += chunk;
      });
      res.on('end', function () {
        logger.info('Ending response : %s:%s', isAlive, error ? error : 'SUCCESS');
        oResult(isAlive, error);
      });

    });
  
  req.on('socket', function (socket) {
      socket.setTimeout(1000);  
      socket.on('timeout', function() {
        logger.info("TIMEOUT:  request timeout. Assuming it host is not reachable.");
//        oResult(false, "Request Timeout");
      });
  });

  req.on('error', function (e) {
    logger.error('Problem with request to %s:%s. Verify server address is valid: %s', dockerHost, dockerPort, e.message);
    oResult(false, e.message);
  });

  req.end();
};
exports.isServerFullyLoaded = function (server, callback) {
  logger.info('Checking Load on server <%s:%s>', server.hostname, server.port);
  var resBody = '';
  var options = {
      hostname: server.hostname,
      port: 3005,
      path: '/host/avgLoad?minutes=15',
      method: 'GET'
    };
  var req = http.request(options, function (res) {
      console.log('STATUS: ' + res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        resBody += chunk;
      });
      res.on('end', function () {
        jResBody = JSON.parse(resBody);
        if (typeof jResBody.AverageLoad !== 'undefined' && jResBody.AverageLoad) {
          logger.info('Load on server <%s:%s>: %s', server.hostname, server.port, parseFloat(jResBody.AverageLoad));
          if (parseFloat(jResBody.AverageLoad) >= 2.7)
            callback(false);
          else
            callback(true);
        } else
          callback(false);
      });
    });
  req.on('error', function (e) {
    logger.error('Error in requesting average load: ' + e.message);
    callback(false);
  });
  req.end();
};
exports.sendImagePullRequestToHost = function (host, tagWithRepository, callback) {
  var resposeBody = '';
  var options = {
      hostname: host.hostname,
      port: host.managerPort,
      path: util.format('/docker/pullImage?tag=%s', tagWithRepository),
      method: 'POST'
    };
  logger.info(options);
  logger.info('Sending request :' + util.format('/pushImage?tag=%s', tagWithRepository));
  var req = http.request(options, function (res) {
      console.log('STATUS: ' + res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        resposeBody += chunk;
      });
      res.on('end', function () {
        console.log('BODY', resposeBody);
        callback(null, resposeBody, res.statusCode);
      });
    });
  req.on('error', function (e) {
    resposeBody = '';
    console.log('problem with request: ' + e.message);
    callback(e.message, null, null);
  });
  req.end();
};
exports.sendImagePushRequestToHost = function (host, tagWithRepository, callback) {
  var resposeBody = '';
  var options = {
      hostname: host.hostname,
      port: host.managerPort,
      path: util.format('/docker/pushImage?tag=%s', tagWithRepository),
      method: 'POST'
    };
  logger.info(options);
  logger.info('Sending request :' + util.format('/pushImage?tag=%s', tagWithRepository));
  var req = http.request(options, function (res) {
      console.log('STATUS: ' + res.statusCode);
      console.log('HEADERS: ' + JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        resposeBody += chunk;
      });
      res.on('end', function () {
        console.log('BODY', resposeBody);
        callback(resposeBody, res.statusCode, null);
      });
    });
  req.on('error', function (e) {
    resposeBody = '';
    console.log('Problem broadcasting pull request: ' + e.message);
    callback(null, null, e.message);
  });
  req.end();
};