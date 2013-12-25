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
var util = require('util');
var rdsClient = require('../config/database');
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
exports.hinspect = function (req, res) {
  var containerId = req.params.container_id;
  var selectedHostId = parseInt(req.params.host_id);
  var repository, hostStatusCode = null;
  try {
    repository = req.query.repository.trim();
  } catch (err) {
    repository = '';
  }
  var imgInfo = {};
  var containerList = [];
  var dockerHostList = [];
  var hostToQuery = {};
  var errMessages = [];
  var viewData = null;
  async.series([
    function (callback) {
      appUtil.getDockerHosts(function (err, hostList) {
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
        callback('No Docker host available yet.');
        return;
      }
      hostToQuery = dockerHostList.filter(function (item) {
        return item.id === selectedHostId;
      })[0];
      if (typeof hostToQuery === 'undefined') {
        logger.info('Invalid HostId :\'' + selectedHostId + '\'');
        callback('Invalid Host. No such host added ');
        return;
      }
      callback();
    },
    function (callback) {
      var cliMessage = null;
      logger.info('Retrieving image data from : ' + hostToQuery);
      var querystring = '/containers/' + containerId + '/json';
      appUtil.makeGetRequestToHost(hostToQuery, querystring, function (errorMessage, data, statusCode) {
        hostStatusCode = statusCode;
        switch (statusCode) {
        case 200:
          viewData = JSON.parse(data);
          break;
        case 404:
          viewData = 'No such container : ' + containerId;
          break;
        case 500:
          viewData = 'Server Error';
          break;
        default:
          viewData = 'Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>';
          logger.info(viewData);
          break;
        }
        logger.info(viewData);
        callback();
      });
    }
  ], function (err) {
    if (err)
      viewData = 'Failed to inspect container : ' + err;
    res.render('container/inspect', {
      title: 'Inspect Container',
      'data': viewData,
      statusCode: hostStatusCode,
      containerInfo: {
        id: containerId,
        runningOn: hostToQuery
      }
    });
  });
};
/*
|| Get list of all servers
|| ->Filter all docker live servers
||    -> forEach get container list and append to resultSet
|| Show the resultSet
*/
exports.list = function (req, res) {
  var areAll = 1, viewData;
  if (req.query.all)
    areAll = parseInt(req.query.all);
  appUtil.makeGetRequest('/containers/json?size=1&all=' + areAll, function (data, statusCode, errorMessage) {
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
      'areAll': areAll,
      'data': viewData,
      statusCode: statusCode,
      page: 'containers_list'
    });
  });
};
exports.listAll = function (req, res) {
  var areAll = 1;
  if (req.query.all)
    areAll = parseInt(req.query.all);
  var querystring = '/containers/json?size=1&all=' + areAll;
  var liveHostsList = [];
  var dockerHostList = [];
  var hostContainersList = [];
  var hostContainerQueryReport = [];
  async.series([
    function (callback) {
      appUtil.getDockerHosts(function (err, hostList) {
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
        callback('No Docker host available yet.');
        return;
      }
      async.filter(dockerHostList, function (host, cb) {
        appUtil.isDockerServerAlive(host.hostname, host.dockerPort, function (isAlive, errorMessage) {
          logger.info('=========================Alive : ' + isAlive);
          cb(isAlive);
        });
      }, function (results) {
        liveHostsList = results;
        callback();
      });
    },
    function (callback) {
      if (liveHostsList.length === 0) {
        callback('No Docker Server is up. Please try again later. ');
        return;
      }
      logger.info('Live Docker Host Count: %d/%d ', liveHostsList.length, dockerHostList.length);
      async.each(liveHostsList, function (liveHost, cb) {
        var cliResponse = null;
        appUtil.makeGetRequestToHost(liveHost, querystring, function (errorMessage, data, statusCode) {
          var cliContainerList = null;
          switch (statusCode) {
          case 200:
            cliContainerList = JSON.parse(data);
            cliResponse = util.format('<%s:%s> : Container list[%d] retrieved successfully.', liveHost.hostname, liveHost.dockerPort, cliContainerList.length);
            cliContainerList.map(function (container) {
              return container.runningOn = liveHost;
            });
            hostContainerQueryReport.push({
              text: cliResponse,
              type: 'success'
            });
            logger.info(cliResponse);
            break;
          case 400:
            cliResponse = util.format('<%s:%s> : Bad Parameters.', liveHost.hostname, liveHost.dockerPort);
            hostContainerQueryReport.push({
              text: cliResponse,
              type: 'error'
            });
            logger.info(cliResponse);
            break;
          case 500:
            cliResponse = util.format('<%s:%s> : Server error. %s', liveHost.hostname, liveHost.dockerPort, errorMessage);
            hostContainerQueryReport.push({
              text: cliResponse,
              type: 'error'
            });
            logger.info(cliResponse);
            break;
          default:
            cliResponse = util.format('<%s:%s> :Unable to query list of containers. Please check your network connection.<%s>', liveHost.hostname, liveHost.dockerPort, errorMessage);
            hostContainerQueryReport.push({
              text: cliResponse,
              type: 'error'
            });
            logger.info(cliResponse);
          }
          if (cliContainerList)
            hostContainersList = hostContainersList.concat(cliContainerList);
          cb();
        });
      }, function (err) {
        callback();
      });  // end 'async.each'
    }
  ], function (err) {
    if (err) {
      req.session.messages = {
        hostsReport: hostContainerQueryReport,
        text: err ? JSON.stringify(err) : '',
        type: 'error'
      };
    }
    if (hostContainerQueryReport.length > 0)
      res.render('container/list', {
        title: 'List of Containers',
        'areAll': areAll,
        'data': hostContainersList,
        page: 'containers_list',
        messages: { hostsReport: hostContainerQueryReport }
      });
    return;
  });
};
exports.hlistAll = function (req, res) {
  var areAll = 1;
  if (req.query.all)
    areAll = parseInt(req.query.all);
  var selectedHostId = parseInt(req.params.host_id);
  var querystring = '/containers/json?size=1&all=' + areAll;
  var liveHostsList = [];
  var dockerHostList = [];
  var c_DockerHostList = [];
  var hostContainersList = [];
  var hostContainerQueryReport = [];
  var hostStatusCode = null;
  var errMessages = [];
  async.series([
    function (callback) {
      appUtil.getDockerHosts(function (err, hostList) {
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
        callback('No Docker host available yet.');
        return;
      }
      async.map(dockerHostList, function (host, cb) {
        appUtil.isDockerServerAlive(host.hostname, host.dockerPort, function (isAlive, errorMessage) {
          logger.info('=========================Alive : ' + isAlive);
          host.isAlive = isAlive;
          cb(null, host);
        });
      }, function (err, results) {
        c_DockerHostList = results;
        callback();
      });
    },
    function (callback) {
      if (c_DockerHostList.length === 0) {
        callback('No Docker Server is available yet. Please try again later. ');
        return;
      }
      if (selectedHostId === -1) {
        callback('Select Docker Host. ');
        return;
      }
      logger.info(' c_DockerHostList length: %d/%d', dockerHostList.length, c_DockerHostList.length);
      hostToQuery = c_DockerHostList.filter(function (item) {
        return item.id === selectedHostId;
      })[0];
      if (typeof hostToQuery === 'undefined') {
        callback('Invalid Host Id');
        return;
      }
      logger.info('++++++++++++ ' + JSON.stringify(hostToQuery));
      var cliResponse = null;
      appUtil.makeGetRequestToHost(hostToQuery, querystring, function (errorMessage, data, statusCode) {
        hostStatusCode = statusCode;
        switch (statusCode) {
        case 200:
          hostContainersList = JSON.parse(data);
          cliResponse = util.format('<%s:%s> : Container list[%d] retrieved successfully.', hostToQuery.hostname, hostToQuery.dockerPort, hostContainersList.length);
          hostContainersList.map(function (container) {
            return container.runningOn = hostToQuery;
          });
          hostContainersList.runningOn = hostToQuery;
          break;
        case 400:
          cliResponse = util.format('<%s:%s> : Bad Parameters.', hostToQuery.hostname, hostToQuery.dockerPort);
          errMessages.push({
            text: cliResponse,
            type: 'error'
          });
          break;
        case 500:
          cliResponse = util.format('<%s:%s> : Server error. %s', hostToQuery.hostname, hostToQuery.dockerPort, errorMessage);
          errMessages.push({
            text: cliResponse,
            type: 'error'
          });
          break;
        default:
          cliResponse = util.format('<%s:%s> :Unable to query list of containers. Please check your network connection.<%s>', hostToQuery.hostname, hostToQuery.dockerPort, errorMessage);
          errMessages.push({
            text: cliResponse,
            type: 'error'
          });
        }
        logger.info(cliResponse);
        callback();
      });
    }
  ], function (err) {
    if (err) {
      res.render('docker/list', {
        title: 'List of images',
        page: 'images_list',
        criticalError: err,
        hostList: c_DockerHostList,
        statusCode: hostStatusCode,
        fullURL : req.protocol + "://" + req.get('host') + req.url
      });
      return;
    } else
      res.render('container/list', {
        title: 'List of Containers',
        'areAll': areAll,
        'data': hostContainersList,
        page: 'containers_list',
        hostList: c_DockerHostList,
        statusCode: hostStatusCode,
        errorMessages: errMessages,
        fullURL : req.protocol + "://" + req.get('host') + req.url

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
      Image: Image.toString(),
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
        text: 'Server error.' + result,
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
  });
};
exports.toggleStatus = function (req, res) {
  isContainerRunning(req.params.id, function (running) {
    var taskToPerform = running ? 'stop?t=5' : 'start';
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
          type: 'success'
        };
        break;
      case 500:
        req.session.messages = {
          text: 'Server error. ' + result,
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
exports.htoggleStatus = function (req, res) {
  var containerId = req.params.container_id;
  var selectedHostId = parseInt(req.params.host_id);
  var redirectURL = null;
  if( req.query.redirectURL !== 'undefined' )
    redirectURL = req.query.redirectURL ;
  else
    redirectURL =  util.format("hosts/%d/containers/%s/inspect", selectedHostId, containerId ); 

  

  var dockerHostList = [];
  var hostToQuery = {};
  var errMessages = [];
  var viewData = '';
  async.series([
    function (callback) {
      appUtil.getDockerHosts(function (err, hostList) {
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
        callback('No Docker host available yet.');
        return;
      }
      hostToQuery = dockerHostList.filter(function (item) {
        return item.id === selectedHostId;
      })[0];
      if (typeof hostToQuery === 'undefined') {
        callback('Invalid Host Id :\'' + selectedHostId + '\' ');
        return;
      }
      callback();
    },
    function (callback) {
      var cliMessage = null;
      logger.info('Retrieving image data from : ' + hostToQuery);
      isContainerRunningInHost(hostToQuery, containerId, function (running) {
        var taskToPerform = running ? 'stop?t=5' : 'start';
        console.log(running ? 'Stopping container...' : 'Starting container...');
        var querystring = '/containers/' + containerId + '/' + taskToPerform;
        appUtil.makePostRequestToHost(hostToQuery, querystring, null, null, function (result, statusCode, errorMessage) {
          switch (statusCode) {
          case 404:
            req.session.messages = {
              text: 'No such container : \'' + containerId + '\' ',
              type: 'error'
            };
            break;
          case 204:
            req.session.messages = {
              text: '\'' + containerId + '\' container ' + (running ? 'stopped' : 'started') + ' successfully. ',
              type: 'success'
            };
            break;
          case 500:
            req.session.messages = {
              text: 'Server error. ' + result,
              type: 'error'
            };
            break;
          default:
            req.session.messages = {
              text: 'Unable to query list of containers. Please check your network connection. : <' + errorMessage + '>',
              type: 'error'
            };
            break;
          }
          callback();
        });
      });  //  end 'isContainerRunning'
    }
  ], function (err) {
    if (err)
      errMessages.push({
        text: err,
        type: 'error'
      });


    console.log(':::::::::::::::::::Redirecting to : ', redirectURL);
    res.redirect(redirectURL);
    res.end();
  });
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
exports.hkill = function (req, res) {
  var containerId = req.params.container_id;
  var selectedHostId = parseInt(req.params.host_id);
  var dockerHostList = [];
  var hostToQuery = {};
  var errMessages = [];
  var viewData = '';

  var redirectURL = null;
  if( req.query.redirectURL !== 'undefined' )
    redirectURL = req.query.redirectURL ;
  else
    redirectURL =  util.format("hosts/%d/containers/%s/inspect", selectedHostId, containerId ); 

  async.series([
    function (callback) {
      appUtil.getDockerHosts(function (err, hostList) {
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
        callback('No Docker host available yet.');
        return;
      }
      hostToQuery = dockerHostList.filter(function (item) {
        return item.id === selectedHostId;
      })[0];
      if (typeof hostToQuery === 'undefined') {
        callback('Invalid Host Id :\'' + selectedHostId + '\' ');
        return;
      }
      callback();
    },
    function (callback) {
      var cliMessage = null;
      logger.info(util.format('Retrieving image data from : %j', hostToQuery));
      var querystring = '/containers/' + containerId + '/kill';
      appUtil.makePostRequestToHost(hostToQuery, querystring, null, null, function (result, statusCode, errorMessage) {
        switch (statusCode) {
        case 404:
          req.session.messages = {
            text: 'No such container : \'' + containerId + '\' ',
            type: 'error'
          };
          break;
        case 204:
          req.session.messages = {
            text: '\'' + containerId + '\' container killed successfully.',
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

      });
    }
  ], function (err) {
    if (err)
      errMessages.push({
        text: err,
        type: 'error'
      });
    logger.info("Redirecting to: ", redirectURL);
    res.redirect(redirectURL);
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
exports.hdelete = function (req, res) {
  var containerId = req.params.container_id;
  var selectedHostId = parseInt(req.params.host_id);
  var dockerHostList = [];
  var hostToQuery = {};
  var errMessages = [];
  var viewData = '';
  var redirectURL = null;
  if( req.query.redirectURL !== 'undefined' )
    redirectURL = req.query.redirectURL ;
  else
    redirectURL =  util.format("hosts/%d/containers/%s/inspect", selectedHostId, containerId ); 

  async.series([
    function (callback) {
      appUtil.getDockerHosts(function (err, hostList) {
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
        callback('No Docker host available yet.');
        return;
      }
      hostToQuery = dockerHostList.filter(function (item) {
        return item.id === selectedHostId;
      })[0];
      if (typeof hostToQuery === 'undefined') {
        callback('Invalid Host Id :\'' + selectedHostId + '\' ');
        return;
      }
      callback();
    },
    function (callback) {
      var cliMessage = null;
      logger.info('Retrieving image data from : ' + hostToQuery);
      var querystring = '/containers/' + containerId;
      appUtil.makeDELETERequestToHost(hostToQuery, '/containers/' + containerId, function (errorMessage, result, statusCode) {
        switch (statusCode) {
        case 409:
          req.session.messages = {
            text: 'Conflict in removing container : \'' + containerId + '\' ',
            type: 'error'
          };
          break;
        case 404:
          req.session.messages = {
            text: 'No such container : \'' + containerId + '\' ',
            type: 'error'
          };
          break;
        case 204:
          req.session.messages = {
            text: '\'' + containerId + '\' container removed successfully.',
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
        callback();
      });
    }
  ], function (err) {
    if (err)
      errMessages.push({
        text: err,
        type: 'error'
      });
    logger.info("Redirecting to: ", redirectURL);
    res.redirect(redirectURL);
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
function isContainerRunningInHost(host, containerID, onResult) {
  var running = false;
  appUtil.makeGetRequestToHost(host, '/containers/' + containerID + '/json', function (errorMessage, data, statusCode) {
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
      appUtil.getDockerHosts(function (err, hostList) {
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
      logger.info('Live Docker Host Count: %d/%d ', liveHostsList.length, dockerHostList.length);
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
      logger.info('Partially Loaded Docker Host Count: %d/%d ', partialLoadedHosts.length, liveHostsList.length);
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
              text: util.format('Host:<%s:%s> : Container \'%s\' created successfully.' + (typeof jResult.Warnings !== 'undefined' ? ' Warnings: ' + JSON.stringify(jResult.Warnings) : ''), host.hostname, host.dockerPort, require('querystring').unescape(containerName)),
              type: 'success'
            });
            logger.info('Container[' + jResult.Id + '] created successfully.' + (typeof jResult.Warnings !== 'undefined' ? ' Warnings: ' + JSON.stringify(jResult.Warnings) : ''));
            break;
          case 500:
            logger.info('Server error. ' + result);
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
          req.session.messages = { hostsReport: hostResponseResultArr };
        logger.info('Completed.');
        callback();
      });
    }
  ], function (err, results) {
    if (err) {
      req.session.messages = {
        text: err ? JSON.stringify(err) : '',
        type: 'error',
        oData: jsonContainerData
      };
      res.redirect('/containers/new');
    } else
      res.redirect('/hosts/-1/containers/list');
    res.end();
    return;
  });
};