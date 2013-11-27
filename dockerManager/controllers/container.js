/*
||docker.js
||Description:   Contain functions to operate on containers  using dockers remote api's
||				->index() : entery file
||				->list() : lsit all containers 
||				->progressStatus() : function to track file uploading progress status 
*/
var appUtil = require('./app_util');
var config = require('../config/config');
var logger = require('../config/logger');
var async = require('async');
var redis = require('redis');
var util = require('util');
var rdsClient = redis.createClient(config.redis.port, config.redis.hostname);
exports.index = function (req, res) {
  res.render('docker/index', {
    title: 'Dashboard',
    dockerfile_name: req.params.docfileName
  });
};
exports.inspect = function (req, res) {
  //makeGetRequest("/containers/json?all=1" , function(data){
  appUtil.makeGetRequest('/containers/' + req.params.id + '/json', function (data, statusCode, errorMessage) {
    switch (statusCode) {
    case 200:
      viewData = JSON.parse(data);
      break;
    case 404:
      viewData = 'No such container : ' + req.params.id;
      break;
    case 500:
      viewData = 'Server Error';
      break;
    default:
      console.log('Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>');
      req.session.messages = {
        text: 'Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>',
        type: 'error'
      };
      res.redirect('docker/' + req.params.id);
      res.end();
    }
    console.log(viewData);
    res.render('container/inspect', {
      title: 'Inspect Container',
      id: req.params.id,
      'data': viewData,
      statusCode: statusCode
    });
  });
};
exports.list = function (req, res) {
  appUtil.makeGetRequest('/containers/json?all=1&size=1', function (data, statusCode, errorMessage) {
    switch (statusCode) {
    case 200:
      viewData = JSON.parse(data);
      break;
    case 400:
      viewData = 'Bad Parameters ';
      break;
    case 500:
      viewData = 'Server Error : ' + errorMessage;
      break;
    default:
      req.session.messages = {
        text: 'Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>',
        type: 'error'
      };
      viewData = 'Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>';
    }
    console.log(viewData);
    res.render('container/list', {
      title: 'List of Containers',
      id: req.params.id,
      'data': viewData,
      statusCode: statusCode,
      page: 'containers_list'
    });
  });
};
exports.index = function (req, res) {
  res.redirect('/containers/list');
};
exports.new = function (req, res) {
  res.render('container/new', { title: 'Create New Container' });
};
exports.create = function (req, res) {
  var containerName = require('querystring').escape(req.body.name.trim());
  var Hostname = req.body.Hostname;
  var User = req.body.User;
  var Memory = parseInt(req.body.Memory);
  var MemorySwap = parseInt(req.body.MemorySwap);
  var AttachStdin = typeof req.body.AttachStdin === 'undefined' ? false : true;
  var AttachStdout = typeof req.body.AttachStdout === 'undefined' ? false : true;
  var AttachStderr = typeof req.body.AttachStderr === 'undefined' ? false : true;
  var PortSpecs = req.body.PortSpecs === 'null' ? null : req.body.PortSpecs;
  var Privileged = typeof req.body.Privileged === 'undefined' ? false : true;
  var Tty = typeof req.body.Tty === 'undefined' ? false : true;
  var OpenStdin = typeof req.body.OpenStdin === 'undefined' ? false : true;
  var StdinOnce = typeof req.body.StdinOnce === 'undefined' ? false : true;
  var Env = req.body.Env === 'null' ? null : req.body.Env;
  var Cmd = [];
  Cmd.push(req.body.Cmd);
  var Dns = req.body.Dns === 'null' ? null : req.body.Dns;
  var Image = req.body.Image;
  var Volumes = null;
  // req.body.Volumes ;
  var VolumesFrom = req.body.VolumesFrom;
  var WorkingDir = req.body.WorkingDir;
  console.log('AttachStdin : ' + req.body.AttachStdin);
  var jsonContainerData = {
      Name: containerName,
      Hostname: Hostname,
      User: User,
      Memory: Memory,
      MemorySwap: MemorySwap,
      AttachStdin: AttachStdin,
      AttachStdout: AttachStdout,
      AttachStderr: AttachStderr,
      PortSpecs: PortSpecs,
      Privileged: Privileged,
      Tty: Tty,
      OpenStdin: OpenStdin,
      StdinOnce: StdinOnce,
      Env: Env,
      Cmd: Cmd,
      Dns: Dns,
      Image: Image,
      Volumes: Volumes,
      VolumesFrom: VolumesFrom,
      WorkingDir: WorkingDir
    };
  var str_ContainerData = JSON.stringify(jsonContainerData);
  //res.end( str_ContainerData);
  var headers = {
      'Content-Type': 'application/json',
      'Content-Length': str_ContainerData.length
    };
  appUtil.makePostRequest('/containers/create', headers, str_ContainerData, function (result, statusCode, errorMessage) {
    switch (statusCode) {
    case 404:
      req.session.messages = {
        text: 'No such image : \'' + Image + '\' ',
        type: 'error',
        oData: jsonContainerData
      };
      break;
    case 201:
      var jResult = JSON.parse(result);
      console.log(jResult);
      req.session.messages = {
        text: 'Container[' + jResult.Id + '] created successfully.  Warnings: ' + jResult.Warnings,
        type: 'alert'
      };
      res.redirect('/containers/list');
      res.end();
      return;
      break;
    case 500:
      req.session.messages = {
        text: 'Server Error. Cause: ' + result,
        type: 'error',
        oData: jsonContainerData
      };
      break;
    default:
      req.session.messages = {
        text: 'Unable to query docker server. Please check network connection. : <' + errorMessage + '>',
        type: 'error',
        oData: jsonContainerData
      };
    }
    res.redirect(req.headers.referer);
    res.end();
  });
};
exports.toggleStatus = function (req, res) {
  isContainerRunning(req.params.id, function (running) {
    var taskToPerform = running ? 'stop' : 'start';
    console.log(running ? 'Stopping container...' : 'Starting container...');
    appUtil.makePostRequest('/containers/' + req.params.id + '/' + taskToPerform, null, null, function (result, statusCode, errorMessage) {
      switch (statusCode) {
      case 404:
        req.session.messages = {
          text: 'No such container : \'' + req.params.id + '\' ',
          type: 'error'
        };
        break;
      case 204:
        req.session.messages = {
          text: '\'' + req.params.id + '\' container ' + (running ? 'stopped' : 'started') + ' successfully. ',
          type: 'alert'
        };
        break;
      case 500:
        req.session.messages = {
          text: 'Server Error. Cause: ' + result,
          type: 'error'
        };
        break;
      default:
        req.session.messages = {
          text: 'Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>',
          type: 'error'
        };
      }
      res.redirect(req.headers.referer);
      res.end();
    });
  });  //  end 'isContainerRunning'
};
exports.kill = function (req, res) {
  appUtil.makePostRequest('/containers/' + req.params.id + '/kill', null, null, function (result, statusCode, errorMessage) {
    switch (statusCode) {
    case 404:
      req.session.messages = {
        text: 'No such container : \'' + req.params.id + '\' ',
        type: 'error'
      };
      break;
    case 204:
      req.session.messages = {
        text: '\'' + req.params.id + '\' container killed successfully.',
        type: 'alert'
      };
      break;
    case 500:
      req.session.messages = {
        text: 'Server Error : ' + result,
        type: 'error'
      };
      break;
    default:
      req.session.messages = {
        text: 'Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>',
        type: 'error'
      };
    }
    res.redirect(req.headers.referer);
    //res.redirect("/containers/list");
    res.end();
  });
};
exports.delete = function (req, res) {
  appUtil.makeDELETERequest('/containers/' + req.params.id, function (result, statusCode, errorMessage) {
    switch (statusCode) {
    case 409:
      req.session.messages = {
        text: 'Conflict in removing container : \'' + req.params.id + '\' ',
        type: 'error'
      };
      break;
    case 404:
      req.session.messages = {
        text: 'No such container : \'' + req.params.id + '\' ',
        type: 'error'
      };
      break;
    case 204:
      req.session.messages = {
        text: '\'' + req.params.id + '\' container removed successfully.',
        type: 'alert'
      };
      break;
    case 500:
      req.session.messages = {
        text: 'Server Error : ' + result,
        type: 'error'
      };
      break;
    default:
      req.session.messages = {
        text: 'Unable to query docker container. Please check your internet connection. <' + errorMessage + '>',
        type: 'error'
      };
    }
    res.redirect('/containers/list');
    res.end();
  });
};
function isContainerRunning(containerID, onResult) {
  var running = false;
  appUtil.makeGetRequest('/containers/' + containerID + '/json', function (data, statusCode) {
    if (statusCode === 200) {
      running = JSON.parse(data).State.Running;
    }
    onResult(running);
  });
}
exports.createInAll = function (req, res) {
  var containerName = require('querystring').escape(req.body.name.trim());
  var Hostname = req.body.Hostname.trim();
  var User = req.body.User.trim();
  var Memory = parseInt(req.body.Memory.trim());
  var MemorySwap = parseInt(req.body.MemorySwap.trim());
  var AttachStdin = typeof req.body.AttachStdin === 'undefined' ? false : true;
  var AttachStdout = typeof req.body.AttachStdout === 'undefined' ? false : true;
  var AttachStderr = typeof req.body.AttachStderr === 'undefined' ? false : true;
  var PortSpecs = req.body.PortSpecs === 'null' ? null : req.body.PortSpecs;
  var Privileged = typeof req.body.Privileged === 'undefined' ? false : true;
  var Tty = typeof req.body.Tty === 'undefined' ? false : true;
  var OpenStdin = typeof req.body.OpenStdin === 'undefined' ? false : true;
  var StdinOnce = typeof req.body.StdinOnce === 'undefined' ? false : true;
  var Env = req.body.Env === 'null' ? null : req.body.Env;
  var Cmd = [];
  Cmd.push(req.body.Cmd.trim());
  var Dns = req.body.Dns === 'null' ? null : req.body.Dns.trim();
  var Image = req.body.Image.trim();
  var Volumes = null;
  // req.body.Volumes ;
  var VolumesFrom = req.body.VolumesFrom.trim();
  var WorkingDir = req.body.WorkingDir.trim();
  var jsonContainerData = {
      Name: containerName,
      Hostname: Hostname,
      User: User,
      Memory: Memory,
      MemorySwap: MemorySwap,
      AttachStdin: AttachStdin,
      AttachStdout: AttachStdout,
      AttachStderr: AttachStderr,
      PortSpecs: PortSpecs,
      Privileged: Privileged,
      Tty: Tty,
      OpenStdin: OpenStdin,
      StdinOnce: StdinOnce,
      Env: Env,
      Cmd: Cmd,
      Dns: Dns,
      Image: Image,
      Volumes: Volumes,
      VolumesFrom: VolumesFrom,
      WorkingDir: WorkingDir
    };
  var str_ContainerData = JSON.stringify(jsonContainerData);
  var headers = {
      'Content-Type': 'application/json',
      'Content-Length': str_ContainerData.length
    };
  /*
  1) Get list of docker host  //  
  2) Verify they have image present (also checking if docker server is up/dead)
  3) Identify load on server
  4) Sort by server load 
  5) dispatch request to top three servers
  
  */
  /*
  1) Get list of live docker hosts
  2) Identify load on server
  3) dispatch request to least loaded server
  */
  var totalHosts = 0;
  var liveHostsList = [];
  var dockerfileBuiltStatus = [];
  var dockerHostList = [];
  var partialLoadedHosts = [];
  var hostResponseResultArr = [];
  async.series([
    function (callback) {
      getDockerHosts(function (err, hostList) {
        if (err)
          callback(err, null);
        else {
          dockerHostList = hostList;
          callback();
        }
      });
    },
    function (callback) {
      if (dockerHostList.length === 0) {
        callback('No Docker host available yet.', null);
        return;
      }
      async.filter(dockerHostList, function (host, cb) {
        appUtil.isDockerServerAlive(host.hostname, host.dockerPort, function (isAlive, errorMessage) {
          logger.info('Alive : ' + isAlive);
          cb(isAlive);
        });
      }, function (results) {
        liveHostsList = results;
        callback();
      });
    },
    function (callback) {
      if (liveHostsList.length === 0) {
        callback('No Docker Server is up. Please try later. ', null);
        return;
      }
      logger.info('Checking server load ...');
      async.filter(liveHostsList, appUtil.isServerFullyLoaded, function (results) {
        partialLoadedHosts = results;
        callback();
      });
    },
    function (callback) {
      if (partialLoadedHosts.length === 0) {
        callback('All Docker Servers are heavily loaded. Please try later', null);
        return;
      }
      logger.info('Total requests to dispatch ' + partialLoadedHosts.length);
      async.each(partialLoadedHosts, function (host, doneWithHost) {
        //Dispatching requests
        console.log('Sending create container request to ' + JSON.stringify(host));
        appUtil.makePostRequestToHost(host, '/containers/create?name=' + containerName, headers, str_ContainerData, function (result, statusCode, errorMessage) {
          switch (statusCode) {
          case 404:
            logger.info(util.format('Host:<%s:%s> : No such image : \'%s\' ', host.hostname, host.dockerPort, Image));
            hostResponseResultArr.push({
              text: util.format('Host:<%s:%s> : No such image : \'%s\' ', host.hostname, host.dockerPort, Image),
              type: 'error',
              oData: jsonContainerData
            });
            break;
          case 409:
            logger.log('info', 'Container \'%s\' already exist on <%s:%s>', require('querystring').unescape(containerName), host.hostname, host.dockerPort);
            hostResponseResultArr.push({
              text: util.format('Host:<%s:%s> : Container \'%s\' already exist.', host.hostname, host.dockerPort, require('querystring').unescape(containerName)),
              type: 'error',
              oData: jsonContainerData
            });
            break;
          case 201:
            var jResult = JSON.parse(result);
            console.log(jResult);
            hostResponseResultArr.push({
              text: util.format('Host:<%s:%s> : Container \'%s\' created successfully.' + (typeof jResult.Warnings !== 'undefined' ? ' Warnings: ' + JSON.stringify(jResult.Warnings) : ''), host.hostname, host.dockerPort, containerName),
              type: 'success'
            });
            logger.info('Container[' + jResult.Id + '] created successfully.' + (typeof jResult.Warnings !== 'undefined' ? ' Warnings: ' + JSON.stringify(jResult.Warnings) : ''));
            break;
          case 500:
            logger.info('Server Error. Cause: ' + result);
            hostResponseResultArr.push({
              host: host,
              text: util.format('Host:<%s:%s> : Error. Cause: %s', host.hostname, host.dockerPort, result),
              type: 'error',
              oData: jsonContainerData
            });
            break;
          default:
            logger.info('Unable to query docker server. Please check network connection. : <' + errorMessage + '>');
            hostResponseResultArr.push({
              text: util.format('Host:<%s:%s> :Unable to query docker server. Please check network connection. : <%s>', errorMessage),
              type: 'error',
              oData: jsonContainerData
            });
          }
          doneWithHost();
        });
      }, function (err, results) {
        if (err)
          callback(err, null);
        else
          req.session.messages = { errorList: hostResponseResultArr };
        logger.info('Completed.');
        callback();
      });
    }
  ], function (err, results) {
    if (err) {
      req.session.messages = {
        text: JSON.stringify(err),
        type: 'error',
        oData: jsonContainerData
      };
      res.redirect('/containers/new');
    } else
      res.redirect('/containers/list');
    res.end();
    return;
  });
  function getDockerHosts(callback) {
    var finalHostList = [];
    var jHostList = [];
    rdsClient.lrange('hosts', 0, -1, function (err, hostsList) {
      if (err) {
        callback(err, null);
        return;
      }
      jHostList = hostsList.map(function (host) {
        return JSON.parse(host);
      });
      async.filter(jHostList, function (host, cb) {
        if (typeof host.hostname !== 'undefined')
          cb(true);
        else
          cb(false);
      }, function (results) {
        logger.info('Finish filter hostslist...' + results.length);
        callback(null, results);
      });
    });
  }
  return;
};